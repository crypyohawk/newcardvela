#!/usr/bin/env python3
"""
gcp-vertex-gateway: 将 OpenAI 格式请求转发到 GCP Vertex AI。
当前支持 Claude（Anthropic on Vertex）和 Gemini（Google on Vertex）。
Port: 4149
"""

import os, json, time, threading
from typing import AsyncIterator, Optional, Tuple

import httpx
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from google.oauth2 import service_account
from google.auth.transport.requests import Request as GoogleRequest

app = FastAPI()

# ── 配置 ──────────────────────────────────────────────────────────
PROXY_API_KEY = os.environ.get("PROXY_API_KEY", "gcp-internal-proxy-key")
SA_FILE       = os.environ.get("GCP_SA_FILE", "/opt/gcp-vertex-gateway/credentials/service-account.json")
# 优先读环境变量，否则从 service account JSON 里读 project_id
def _load_project_id() -> str:
    env_val = os.environ.get("GCP_PROJECT_ID", "")
    if env_val:
        return env_val
    try:
        with open(SA_FILE) as f:
            return json.load(f).get("project_id", "")
    except Exception:
        return ""
PROJECT_ID    = _load_project_id()
REGION        = os.environ.get("GCP_REGION", "us-east5")
GEMINI_REGION = os.environ.get("GCP_GEMINI_REGION", "global")

# ── 模型映射（OpenAI 名称 → Vertex AI 模型 ID）──────────────────
MODEL_MAP = {
    # Claude Opus 系列
    "claude-opus-4.7":    "claude-opus-4-7",
    "claude-opus-4.6":    "claude-opus-4-6",
    "claude-opus-4.5":    "claude-opus-4-5",
    "claude-opus-4":      "claude-opus-4",
    # Claude Sonnet 系列
    "claude-sonnet-4.6":  "claude-sonnet-4-6",
    "claude-sonnet-4.5":  "claude-sonnet-4-5",
    "claude-sonnet-4":    "claude-sonnet-4",
    "claude-sonnet":      "claude-sonnet-4",
    # Claude Haiku 系列
    "claude-haiku-4.5":   "claude-haiku-4-5",
    "claude-haiku":       "claude-haiku-4-5",
    # 兼容旧名称
    "claude-3.7-sonnet":  "claude-3-7-sonnet",
}

VISIBLE_CLAUDE_MODELS = [
    "claude-opus-4.7",
    "claude-opus-4.6",
    "claude-opus-4.5",
    "claude-opus-4",
    "claude-sonnet-4.6",
    "claude-sonnet-4.5",
    "claude-sonnet-4",
    "claude-haiku-4.5",
]

GEMINI_MODEL_MAP = {
    # Only expose exact upstream Gemini model IDs to clients.
    "gemini-3.1-pro-preview": "gemini-3.1-pro-preview",
    "gemini-2.5-flash":       "gemini-2.5-flash",
    "gemini-2.0-flash":       "gemini-2.0-flash",
    "gemini-2.0-flash-exp":   "gemini-2.0-flash-exp",
    "gemini-1.5-pro":         "gemini-1.5-pro",
    "gemini-1.5-flash":       "gemini-1.5-flash",
}

VISIBLE_GEMINI_MODELS = [
    "gemini-3.1-pro-preview",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-exp",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
]


def resolve_gemini_model(model: str) -> Tuple[Optional[str], str]:
    if model in GEMINI_MODEL_MAP:
        return GEMINI_MODEL_MAP[model], model
    return None, model

# ── Google OAuth2 Token 缓存 ──────────────────────────────────────
_token_lock  = threading.Lock()
_token_cache = {"value": None, "expires_at": 0}

def get_access_token() -> str:
    with _token_lock:
        now = time.time()
        if _token_cache["value"] and _token_cache["expires_at"] - now > 120:
            return _token_cache["value"]
        creds = service_account.Credentials.from_service_account_file(
            SA_FILE,
            scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
        creds.refresh(GoogleRequest())
        _token_cache["value"]      = creds.token
        _token_cache["expires_at"] = creds.expiry.timestamp() if creds.expiry else now + 3600
        return creds.token

# ── 格式转换：OpenAI → Anthropic ─────────────────────────────────
def to_anthropic(body: dict) -> dict:
    messages = body.get("messages", [])
    system_content = None
    filtered = []
    for msg in messages:
        if msg["role"] == "system":
            system_content = msg["content"]
        else:
            filtered.append({"role": msg["role"], "content": msg["content"]})

    req = {
        "anthropic_version": "vertex-2023-10-16",
        "messages":   filtered,
        "max_tokens": body.get("max_tokens", 8192),
    }
    if system_content:
        req["system"] = system_content
    for k in ("temperature", "top_p"):
        if k in body:
            req[k] = body[k]
    stop = body.get("stop")
    if stop:
        req["stop_sequences"] = [stop] if isinstance(stop, str) else stop
    if body.get("stream"):
        req["stream"] = True
    return req

# ── 格式转换：Anthropic → OpenAI ─────────────────────────────────
def to_openai(data: dict, model: str) -> dict:
    content = ""
    for block in data.get("content", []):
        if block.get("type") == "text":
            content += block.get("text", "")
    usage = data.get("usage", {})
    inp   = usage.get("input_tokens", 0)
    out   = usage.get("output_tokens", 0)
    return {
        "id":      data.get("id", f"chatcmpl-{int(time.time())}"),
        "object":  "chat.completion",
        "created": int(time.time()),
        "model":   model,
        "choices": [{"index": 0,
                     "message": {"role": "assistant", "content": content},
                     "finish_reason": data.get("stop_reason", "stop")}],
        "usage":   {"prompt_tokens": inp, "completion_tokens": out, "total_tokens": inp + out},
    }


def to_gemini(body: dict) -> dict:
    messages = body.get("messages", [])
    system_parts = []
    contents = []

    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")

        if isinstance(content, list):
            text_parts = []
            for part in content:
                if isinstance(part, dict) and part.get("type") == "text":
                    text_parts.append(part.get("text", ""))
            content = "\n".join(part for part in text_parts if part)

        if role == "system":
            if content:
                system_parts.append({"text": content})
            continue

        gemini_role = "model" if role == "assistant" else "user"
        parts = [{"text": content or ""}]
        contents.append({"role": gemini_role, "parts": parts})

    req = {
        "contents": contents,
        "generationConfig": {
            "maxOutputTokens": body.get("max_tokens", 8192),
        },
    }

    if system_parts:
        req["systemInstruction"] = {"parts": system_parts}

    generation_config = req["generationConfig"]
    if "temperature" in body:
        generation_config["temperature"] = body["temperature"]
    if "top_p" in body:
        generation_config["topP"] = body["top_p"]
    if "frequency_penalty" in body:
        generation_config["frequencyPenalty"] = body["frequency_penalty"]
    if "presence_penalty" in body:
        generation_config["presencePenalty"] = body["presence_penalty"]

    stop = body.get("stop")
    if stop:
        generation_config["stopSequences"] = [stop] if isinstance(stop, str) else stop

    return req


def gemini_text_from_candidate(candidate: dict) -> str:
    parts = candidate.get("content", {}).get("parts", [])
    chunks = []
    for part in parts:
        if part.get("text"):
            chunks.append(part["text"])
    return "".join(chunks)


def to_openai_from_gemini(data: dict, model: str) -> dict:
    candidates = data.get("candidates", [])
    candidate = candidates[0] if candidates else {}
    content = gemini_text_from_candidate(candidate)
    usage = data.get("usageMetadata", {})
    prompt_tokens = usage.get("promptTokenCount", 0)
    completion_tokens = usage.get("candidatesTokenCount", 0)
    finish_reason = (candidate.get("finishReason") or "STOP").lower().replace("finish_reason_", "")
    return {
        "id": f"chatcmpl-{int(time.time())}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": model,
        "choices": [{
            "index": 0,
            "message": {"role": "assistant", "content": content},
            "finish_reason": finish_reason,
        }],
        "usage": {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": usage.get("totalTokenCount", prompt_tokens + completion_tokens),
        },
    }


def openai_chunk(model: str, content: str = "", finish_reason=None) -> str:
    chunk = {
        "id": f"chatcmpl-{int(time.time())}",
        "object": "chat.completion.chunk",
        "created": int(time.time()),
        "model": model,
        "choices": [{
            "index": 0,
            "delta": {"content": content} if content else {},
            "finish_reason": finish_reason,
        }],
    }
    return f"data: {json.dumps(chunk)}\n\n"


def gemini_base_url(region: str) -> str:
    if region == "global":
        return "https://aiplatform.googleapis.com"
    return f"https://{region}-aiplatform.googleapis.com"

# ── SSE 流转换 ───────────────────────────────────────────────────
async def stream_convert(response: httpx.Response, model: str) -> AsyncIterator[str]:
    async for line in response.aiter_lines():
        if not line.startswith("data:"):
            continue
        raw = line[5:].strip()
        if not raw:
            continue
        try:
            data = json.loads(raw)
        except Exception:
            continue

        t = data.get("type")
        if t == "content_block_delta":
            delta = data.get("delta", {})
            if delta.get("type") == "text_delta":
                chunk = {
                    "id": f"chatcmpl-{int(time.time())}",
                    "object": "chat.completion.chunk",
                    "created": int(time.time()),
                    "model": model,
                    "choices": [{"index": 0,
                                 "delta": {"content": delta.get("text", "")},
                                 "finish_reason": None}]
                }
                yield f"data: {json.dumps(chunk)}\n\n"
        elif t == "message_stop":
            chunk = {
                "id": f"chatcmpl-{int(time.time())}",
                "object": "chat.completion.chunk",
                "created": int(time.time()),
                "model": model,
                "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}]
            }
            yield f"data: {json.dumps(chunk)}\n\n"
            yield "data: [DONE]\n\n"

# ── 主接口 ────────────────────────────────────────────────────────
@app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    auth = request.headers.get("Authorization", "")
    if auth != f"Bearer {PROXY_API_KEY}":
        raise HTTPException(401, "Unauthorized")

    body         = await request.json()
    model        = body.get("model", "claude-sonnet-4")
    is_stream    = body.get("stream", False)

    if model in MODEL_MAP:
        headers = {
            "Authorization": f"Bearer {get_access_token()}",
            "Content-Type":  "application/json",
        }
        vertex_model = MODEL_MAP[model]
        endpoint = ":streamRawPredict" if is_stream else ":rawPredict"
        url = (
            f"https://{REGION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}"
            f"/locations/{REGION}/publishers/anthropic/models/{vertex_model}{endpoint}"
        )
        anthropic_body = to_anthropic(body)

        if is_stream:
            async def generate():
                async with httpx.AsyncClient(timeout=180) as client:
                    async with client.stream("POST", url, json=anthropic_body, headers=headers) as resp:
                        if resp.status_code != 200:
                            err = await resp.aread()
                            yield f"data: {json.dumps({'error': err.decode()})}\n\n"
                            return
                        async for chunk in stream_convert(resp, model):
                            yield chunk
            return StreamingResponse(generate(), media_type="text/event-stream")

        async with httpx.AsyncClient(timeout=180) as client:
            resp = await client.post(url, json=anthropic_body, headers=headers)
        if resp.status_code != 200:
            raise HTTPException(resp.status_code, resp.text)
        return JSONResponse(to_openai(resp.json(), model))

    vertex_model, response_model = resolve_gemini_model(model)
    if vertex_model:
        headers = {
            "Authorization": f"Bearer {get_access_token()}",
            "Content-Type":  "application/json",
        }
        url = (
            f"{gemini_base_url(GEMINI_REGION)}/v1/projects/{PROJECT_ID}"
            f"/locations/{GEMINI_REGION}/publishers/google/models/{vertex_model}:generateContent"
        )
        gemini_body = to_gemini(body)

        async with httpx.AsyncClient(timeout=180) as client:
            resp = await client.post(url, json=gemini_body, headers=headers)
        if resp.status_code != 200:
            raise HTTPException(resp.status_code, resp.text)

        openai_data = to_openai_from_gemini(resp.json(), response_model)
        if not is_stream:
            return JSONResponse(openai_data)

        content = openai_data["choices"][0]["message"]["content"]
        finish_reason = openai_data["choices"][0].get("finish_reason", "stop")

        async def generate_gemini_stream():
            if content:
                yield openai_chunk(response_model, content=content)
            yield openai_chunk(response_model, finish_reason=finish_reason)
            yield "data: [DONE]\n\n"

        return StreamingResponse(generate_gemini_stream(), media_type="text/event-stream")

    raise HTTPException(400, f"Unsupported model: {model}")

@app.get("/v1/models")
async def list_models(request: Request):
    auth = request.headers.get("Authorization", "")
    if auth != f"Bearer {PROXY_API_KEY}":
        raise HTTPException(401, "Unauthorized")
    return {
        "object": "list",
                "data": [
                        *[{"id": m, "object": "model", "created": int(time.time()), "owned_by": "anthropic"}
                            for m in VISIBLE_CLAUDE_MODELS],
                        *[{"id": m, "object": "model", "created": int(time.time()), "owned_by": "google"}
                            for m in VISIBLE_GEMINI_MODELS],
                ]
    }

@app.get("/health")
async def health():
    return {"status": "ok", "project": PROJECT_ID, "region": REGION, "gemini_region": GEMINI_REGION}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 4149))
    uvicorn.run(app, host="0.0.0.0", port=port)

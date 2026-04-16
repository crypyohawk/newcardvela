/**
 * API 兼容代理 - 解决两类兼容性问题:
 *
 * 1. Cursor IDE 的 Responses API 格式问题:
 *    Cursor 使用 "Override OpenAI Base URL" 时发送 Responses API 格式
 *    (input 而非 messages) 到 /v1/chat/completions, 导致 "field messages is required"。
 *    代理自动检测并转换; 已有 messages 的请求原样透传, 不影响其他编辑器。
 *
 * 2. GPT-5.x 系列模型的 max_tokens 不兼容问题:
 *    所有编辑器发送 max_tokens 参数时, GPT-5.x 上游会拒绝,
 *    要求使用 max_completion_tokens。代理自动对 GPT-5.x 系列模型
 *    将 max_tokens 转为 max_completion_tokens。
 *
 * 部署:
 *   pm2 start cursor-compat-proxy.js --name cursor-compat
 *   Nginx 将 api.cardvela.com 指向本代理 (3002), 代理转发至 new-api (3001)
 */

const http = require('http');

const UPSTREAM_HOST = '127.0.0.1';
const UPSTREAM_PORT = 3001;
const LISTEN_PORT = parseInt(process.env.COMPAT_PORT || '3002', 10);

// ─── 503/502 自动重试配置 ───
const RETRY_MAX = 3;                     // 最多重试次数
const RETRY_DELAYS = [500, 1000, 2000];  // 重试延迟 (ms)
const RETRYABLE_STATUS = new Set([502, 503]);

// ─── Responses API → Chat Completions 转换 ───

// 规范化 content parts 的 type 字段
// Responses API 用 input_text/output_text, Chat Completions 只接受 text/image_url
function normalizeContentParts(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return content;

  return content.map(part => {
    if (!part || typeof part !== 'object') return part;
    // input_text / output_text → text
    if (part.type === 'input_text' || part.type === 'output_text') {
      return { type: 'text', text: part.text };
    }
    // input_image → image_url
    if (part.type === 'input_image') {
      return { type: 'image_url', image_url: { url: part.image_url || part.url } };
    }
    // input_audio → 暂不支持, 转为文本描述
    if (part.type === 'input_audio') {
      return { type: 'text', text: '[audio content]' };
    }
    // refusal → text
    if (part.type === 'refusal') {
      return { type: 'text', text: part.refusal || '' };
    }
    // 已经是 text/image_url → 原样
    return part;
  });
}

function convertInputToMessages(input, instructions) {
  const messages = [];

  // 如果有 instructions, 作为 system message 放在最前面
  if (instructions) {
    messages.push({ role: 'system', content: instructions });
  }

  if (typeof input === 'string') {
    messages.push({ role: 'user', content: input });
    return messages;
  }

  if (!Array.isArray(input)) {
    return messages;
  }

  for (const item of input) {
    if (!item) continue;

    // EasyInputMessage 格式: {role, content}
    if (item.role && item.content !== undefined && !item.type) {
      // content 可能是字符串或数组(多模态) — 需要规范化 type
      messages.push({ role: item.role, content: normalizeContentParts(item.content) });
      continue;
    }

    // Responses API item 格式: {type: "message", role, content: [...]}
    if (item.type === 'message' && item.role) {
      messages.push({ role: item.role, content: normalizeContentParts(item.content) });
      continue;
    }

    // function_call → assistant message with tool_calls
    if (item.type === 'function_call') {
      // 找到或创建最近的 assistant 消息来附加 tool_call
      let lastAssistant = messages.length > 0 && messages[messages.length - 1].role === 'assistant'
        ? messages[messages.length - 1]
        : null;
      if (!lastAssistant) {
        lastAssistant = { role: 'assistant', content: null, tool_calls: [] };
        messages.push(lastAssistant);
      }
      if (!lastAssistant.tool_calls) {
        lastAssistant.tool_calls = [];
      }
      lastAssistant.tool_calls.push({
        id: item.call_id || item.id || `call_${lastAssistant.tool_calls.length}`,
        type: 'function',
        function: {
          name: item.name,
          arguments: typeof item.arguments === 'string'
            ? item.arguments
            : JSON.stringify(item.arguments || {}),
        },
      });
      continue;
    }

    // function_call_output → tool message
    if (item.type === 'function_call_output') {
      messages.push({
        role: 'tool',
        tool_call_id: item.call_id || item.id,
        content: typeof item.output === 'string' ? item.output : JSON.stringify(item.output || ''),
      });
      continue;
    }

    // 透传: 如果 item 有 role 和 content, 直接用
    if (item.role) {
      messages.push({ role: item.role, content: item.content || '' });
    }
  }

  return messages;
}

function convertToolsFormat(tools) {
  if (!Array.isArray(tools)) return tools;

  return tools
    .filter(tool => {
      // 保留 function 类型, 过滤掉 custom 等非标准类型
      // 但尝试将 custom 转为 function
      return tool && (tool.type === 'function' || tool.type === 'custom');
    })
    .map(tool => {
      // 已经是嵌套格式 {type: "function", function: {...}} → 原样返回
      if (tool.type === 'function' && tool.function) {
        return tool;
      }

      // 扁平格式或 custom 类型 → 转为嵌套格式
      const funcDef = {
        name: tool.name,
        parameters: tool.parameters || { type: 'object', properties: {} },
      };
      if (tool.description) {
        funcDef.description = tool.description;
      }
      if (tool.strict !== undefined) {
        funcDef.strict = tool.strict;
      }

      return { type: 'function', function: funcDef };
    });
}

function convertResponsesApiBody(body) {
  // 已有 messages → 不需要转换
  if (body.messages) return body;
  // 没有 input → 无法转换
  if (body.input === undefined) return body;

  const converted = {};

  // 复制通用字段
  const chatFields = [
    'model', 'stream', 'temperature', 'top_p', 'n', 'stop',
    'frequency_penalty', 'presence_penalty', 'logit_bias',
    'user', 'seed', 'logprobs', 'top_logprobs',
    'parallel_tool_calls', 'tool_choice', 'service_tier',
  ];
  for (const f of chatFields) {
    if (body[f] !== undefined) converted[f] = body[f];
  }

  // 1. input + instructions → messages
  converted.messages = convertInputToMessages(body.input, body.instructions);

  // 2. tools 格式转换
  if (body.tools) {
    converted.tools = convertToolsFormat(body.tools);
    // 如果转换后没有 tools, 删除避免发空数组
    if (converted.tools.length === 0) delete converted.tools;
  }

  // 3. reasoning: {effort} → reasoning_effort
  if (body.reasoning && typeof body.reasoning === 'object') {
    if (body.reasoning.effort) {
      converted.reasoning_effort = body.reasoning.effort;
    }
  } else if (body.reasoning_effort) {
    converted.reasoning_effort = body.reasoning_effort;
  }

  // 4. text: {format} → response_format
  if (body.text && typeof body.text === 'object' && body.text.format) {
    converted.response_format = body.text.format;
  } else if (body.response_format) {
    converted.response_format = body.response_format;
  }

  // 5. max_output_tokens → max_completion_tokens
  if (body.max_output_tokens !== undefined) {
    converted.max_completion_tokens = body.max_output_tokens;
  } else if (body.max_completion_tokens !== undefined) {
    converted.max_completion_tokens = body.max_completion_tokens;
  } else if (body.max_tokens !== undefined) {
    converted.max_tokens = body.max_tokens;
  }

  // stream_options 只保留 include_usage
  if (body.stream && body.stream_options) {
    converted.stream_options = { include_usage: !!body.stream_options.include_usage };
  }

  return converted;
}

// ─── 标准 messages 请求的 content type 规范化 ───
// 有些客户端即使发 messages 格式也带非标准 content type (如 input_text)
function normalizeMessagesContentTypes(body) {
  if (!body.messages || !Array.isArray(body.messages)) return false;
  let changed = false;
  for (const msg of body.messages) {
    if (msg.content && Array.isArray(msg.content)) {
      const normalized = normalizeContentParts(msg.content);
      if (normalized !== msg.content) {
        // 检查是否真的变了
        const origJson = JSON.stringify(msg.content);
        const newJson = JSON.stringify(normalized);
        if (origJson !== newJson) {
          msg.content = normalized;
          changed = true;
        }
      }
    }
  }
  return changed;
}

// ─── max_tokens → max_completion_tokens 修复 (GPT-5.x 系列) ───

// 匹配需要 max_completion_tokens 的模型
const MODELS_REQUIRING_MAX_COMPLETION_TOKENS = /^(gpt-5|gpt-4o|o[1-9]|o3)/i;

function fixMaxTokens(body) {
  if (!body || !body.model) return false;
  if (!body.max_tokens) return false;
  if (body.max_completion_tokens) return false; // 已有正确字段

  if (MODELS_REQUIRING_MAX_COMPLETION_TOKENS.test(body.model)) {
    body.max_completion_tokens = body.max_tokens;
    delete body.max_tokens;
    return true;
  }
  return false;
}

// ─── reasoning_effort + tools 不兼容修复 (gpt-5.x) ───
// GitHub Copilot 上游对 gpt-5.x 不允许同时发 tools + reasoning_effort
function fixReasoningWithTools(body) {
  if (!body || !body.model) return false;
  if (!body.reasoning_effort) return false;
  if (!body.tools || !Array.isArray(body.tools) || body.tools.length === 0) return false;

  const model = body.model.toLowerCase();
  if (model.includes('gpt-5')) {
    delete body.reasoning_effort;
    return true;
  }
  return false;
}

// ─── HTTP 代理 ───

// 单次代理请求, 返回 {statusCode, headers, body} 而不直接写入 clientRes
function doUpstreamRequest(clientReq, bodyOverride) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: UPSTREAM_HOST,
      port: UPSTREAM_PORT,
      path: clientReq.url,
      method: clientReq.method,
      headers: { ...clientReq.headers },
    };

    if (bodyOverride !== null) {
      const buf = Buffer.from(bodyOverride, 'utf8');
      options.headers['content-length'] = buf.length;
    }

    delete options.headers['host'];

    const upstreamReq = http.request(options, (upstreamRes) => {
      // 对于流式响应或非重试状态码, 直接 resolve 并附上 stream
      const isRetryable = RETRYABLE_STATUS.has(upstreamRes.statusCode);
      const isStream = (upstreamRes.headers['content-type'] || '').includes('text/event-stream');

      if (!isRetryable || isStream) {
        // 不需要缓冲, 直接交出 stream
        resolve({ statusCode: upstreamRes.statusCode, headers: upstreamRes.headers, stream: upstreamRes });
        return;
      }

      // 缓冲小响应体以便判断是否需要重试
      const chunks = [];
      upstreamRes.on('data', c => chunks.push(c));
      upstreamRes.on('end', () => {
        resolve({ statusCode: upstreamRes.statusCode, headers: upstreamRes.headers, body: Buffer.concat(chunks) });
      });
      upstreamRes.on('error', reject);
    });

    upstreamReq.on('error', reject);

    if (bodyOverride !== null) {
      upstreamReq.end(bodyOverride);
    } else {
      // bodyOverride === null 但我们可能需要重试, 所以这里不 pipe
      // 对于没有 body 的情况直接结束
      upstreamReq.end();
    }
  });
}

// 带重试的代理请求
async function proxyRequest(clientReq, clientRes, bodyOverride) {
  // 对于非 POST 请求或没有 body 的 pipe 请求, 不支持重试 (无法重放 body)
  const canRetry = bodyOverride !== null;

  for (let attempt = 0; attempt <= (canRetry ? RETRY_MAX : 0); attempt++) {
    try {
      if (attempt > 0) {
        const delay = RETRY_DELAYS[Math.min(attempt - 1, RETRY_DELAYS.length - 1)];
        console.log(`[proxy] retry #${attempt} after ${delay}ms | path=${clientReq.url}`);
        await new Promise(r => setTimeout(r, delay));
      }

      const result = await doUpstreamRequest(clientReq, bodyOverride);

      // 如果有 stream (非重试场景或成功的流式响应), 直接 pipe
      if (result.stream) {
        clientRes.writeHead(result.statusCode, result.headers);
        result.stream.pipe(clientRes, { end: true });
        return;
      }

      // 检查是否可重试
      if (RETRYABLE_STATUS.has(result.statusCode) && canRetry && attempt < RETRY_MAX) {
        console.log(`[proxy] upstream returned ${result.statusCode}, will retry | path=${clientReq.url} | attempt=${attempt + 1}/${RETRY_MAX}`);
        continue;
      }

      // 最终响应 (成功或最后一次重试)
      if (RETRYABLE_STATUS.has(result.statusCode) && attempt > 0) {
        console.log(`[proxy] all ${RETRY_MAX} retries exhausted, returning ${result.statusCode} | path=${clientReq.url}`);
      }
      clientRes.writeHead(result.statusCode, result.headers);
      clientRes.end(result.body);
      return;

    } catch (err) {
      if (attempt < (canRetry ? RETRY_MAX : 0)) {
        console.error(`[proxy] upstream error on attempt ${attempt + 1}: ${err.message}, will retry`);
        continue;
      }
      console.error(`[proxy] upstream error: ${err.message}`);
      if (!clientRes.headersSent) {
        clientRes.writeHead(502, { 'content-type': 'application/json' });
      }
      clientRes.end(JSON.stringify({
        error: { message: 'upstream connection failed', type: 'proxy_error' },
      }));
      return;
    }
  }
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    const MAX_BODY = 10 * 1024 * 1024; // 10MB 安全限制
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // POST /v1/chat/completions: 需要解析和可能转换 body
  const isChatCompletions = req.method === 'POST' && req.url && req.url.startsWith('/v1/chat/completions');
  // POST /v1/messages: Claude Code 原生格式, 需要缓冲 body 以支持重试
  const isMessages = req.method === 'POST' && req.url && req.url.startsWith('/v1/messages');

  if (!isChatCompletions && !isMessages) {
    // 其他请求 (GET /v1/models 等): 直接透传, 不重试
    return proxyRequest(req, res, null);
  }

  if (isMessages) {
    // Claude Code /v1/messages 请求: 缓冲 body 以支持 503 自动重试
    try {
      const rawBody = await collectBody(req);
      // [DEBUG-MESSAGES] 临时调试日志, 后续确认无问题后删除
      try {
        const parsed = JSON.parse(rawBody);
        const ua = req.headers['user-agent'] || '';
        console.log(`[messages] ${req.url} | model=${parsed.model || 'unknown'} | stream=${!!parsed.stream} | tools=${Array.isArray(parsed.tools) ? parsed.tools.length : 0} | UA=${ua.substring(0, 50)}`);
      } catch (_) { /* ignore parse errors for logging */ }
      // [/DEBUG-MESSAGES]
      return proxyRequest(req, res, rawBody);
    } catch (err) {
      console.error(`[compat] error buffering /v1/messages: ${err.message}`);
      if (!res.headersSent) {
        res.writeHead(500, { 'content-type': 'application/json' });
      }
      res.end(JSON.stringify({
        error: { message: 'proxy body buffer error', type: 'proxy_error' },
      }));
      return;
    }
  }

  try {
    const rawBody = await collectBody(req);
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      // JSON 解析失败, 原样转发让 upstream 处理错误
      return proxyRequest(req, res, rawBody);
    }

    // 检测是否需要 Responses API → Chat Completions 转换
    const needsResponsesConversion = body.input !== undefined && body.messages === undefined;
    // 检测是否需要 max_tokens → max_completion_tokens 修复
    const needsMaxTokensFix = !needsResponsesConversion && fixMaxTokens(body);
    // 检测是否需要 content type 规范化 (messages 中的 input_text 等)
    const needsContentTypeNorm = !needsResponsesConversion && normalizeMessagesContentTypes(body);
    // 检测是否需要移除 reasoning_effort (tools + reasoning_effort 不兼容)
    const needsReasoningFix = !needsResponsesConversion && fixReasoningWithTools(body);

    if (!needsResponsesConversion && !needsMaxTokensFix && !needsContentTypeNorm && !needsReasoningFix) {
      // 标准 Chat Completions 请求且无需任何修复 → 原样透传
      return proxyRequest(req, res, rawBody);
    }

    const ua = req.headers['user-agent'] || '';
    let finalBody;

    if (needsResponsesConversion) {
      // Responses API 格式 → 转换
      const converted = convertResponsesApiBody(body);
      // 转换后也检查 max_tokens 和 reasoning_effort+tools 不兼容
      fixMaxTokens(converted);
      const removedReasoning = fixReasoningWithTools(converted);
      if (removedReasoning) {
        console.log(`[compat] removed reasoning_effort (tools+reasoning conflict) | model=${body.model}`);
      }
      finalBody = JSON.stringify(converted);
      console.log(`[compat] Responses→Chat | model=${body.model || 'unknown'} | UA=${ua.substring(0, 40)} | input_items=${Array.isArray(body.input) ? body.input.length : 1} → messages=${converted.messages ? converted.messages.length : 0}`);
    } else if (needsReasoningFix) {
      // reasoning_effort + tools 不兼容修复
      finalBody = JSON.stringify(body);
      console.log(`[compat] removed reasoning_effort (tools conflict) | model=${body.model} | UA=${ua.substring(0, 40)}`);
    } else if (needsContentTypeNorm) {
      // content type 规范化
      finalBody = JSON.stringify(body);
      console.log(`[compat] content-type normalized | model=${body.model} | UA=${ua.substring(0, 40)}`);
    } else {
      // 仅 max_tokens 修复
      finalBody = JSON.stringify(body);
      console.log(`[compat] max_tokens→max_completion_tokens | model=${body.model} | UA=${ua.substring(0, 40)}`);
    }

    return proxyRequest(req, res, finalBody);
  } catch (err) {
    console.error(`[compat] error: ${err.message}`);
    if (!res.headersSent) {
      res.writeHead(500, { 'content-type': 'application/json' });
    }
    res.end(JSON.stringify({
      error: { message: 'compat proxy internal error', type: 'proxy_error' },
    }));
  }
});

server.listen(LISTEN_PORT, '127.0.0.1', () => {
  console.log(`[compat-proxy] listening on 127.0.0.1:${LISTEN_PORT}`);
  console.log(`[compat-proxy] upstream: ${UPSTREAM_HOST}:${UPSTREAM_PORT}`);
  console.log(`[compat-proxy] fixes: Responses API→Chat Completions, max_tokens→max_completion_tokens, 503 auto-retry (max ${RETRY_MAX})`);
});

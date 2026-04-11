/**
 * Cursor 专用兼容层。
 *
 * 目标：
 * 1. 仅服务 Cursor / Responses 风格请求，避免影响其他编辑器。
 * 2. 将 Cursor 的 Responses 风格请求转换为上游可接受的 Chat Completions。
 * 3. 将上游 Chat Completions 响应重新包装为 Responses 风格响应，避免 Cursor 丢失上下文状态。
 *
 * 部署示例：
 *   COMPAT_PORT=3003 pm2 start cursor-responses-proxy.js --name cursor-responses-proxy
 */

const http = require('http');
const crypto = require('crypto');

const UPSTREAM_HOST = '127.0.0.1';
const UPSTREAM_PORT = 3001;
const LISTEN_PORT = parseInt(process.env.COMPAT_PORT || '3003', 10);
const MODELS_REQUIRING_MAX_COMPLETION_TOKENS = /^(gpt-5|gpt-4o|o[1-9]|o3)/i;

/* ── Model name mapping ── */
const MODEL_MAP = {
  'claude opus-4.6': 'claude-opus-4-6',
  'claude opus-4.6-max': 'claude-opus-4-6-max',
  'claude opus-4.6-high': 'claude-opus-4-6-high',
  'claude opus-4.6-medium': 'claude-opus-4-6-medium',
  'claude opus-4.6-low': 'claude-opus-4-6-low',
  'claude sonnet-4.6': 'claude-sonnet-4-6',
  'claude sonnet-4.5': 'claude-sonnet-4-5-20250929',
  'claude opus-4.5': 'claude-opus-4-5-20251101',
  'claude opus-4.1': 'claude-opus-4-1-20250805',
  'claude opus-4': 'claude-opus-4-20250514',
  'claude sonnet-4': 'claude-sonnet-4-20250514',
};
function mapModel(name) {
  if (!name) return name;
  const key = name.toLowerCase().trim();
  return MODEL_MAP[key] || name;
}

function makeId(prefix) {
  return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizeContentParts(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return content;

  return content.map((part) => {
    if (!part || typeof part !== 'object') return part;
    if (part.type === 'input_text' || part.type === 'output_text') {
      return { type: 'text', text: part.text || '' };
    }
    if (part.type === 'input_image') {
      return { type: 'image_url', image_url: { url: part.image_url || part.url } };
    }
    if (part.type === 'input_audio') {
      return { type: 'text', text: '[audio content]' };
    }
    if (part.type === 'refusal') {
      return { type: 'text', text: part.refusal || '' };
    }
    return part;
  });
}

function textFromContentParts(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';

  return content
    .map((part) => {
      if (!part || typeof part !== 'object') return '';
      if (typeof part.text === 'string') return part.text;
      if (typeof part.refusal === 'string') return part.refusal;
      if (part.type === 'summary_text' && typeof part.text === 'string') return part.text;
      return '';
    })
    .filter(Boolean)
    .join('\n');
}

function extractReasoningText(item) {
  if (!item || typeof item !== 'object') return '';
  if (typeof item.text === 'string') return item.text;
  if (Array.isArray(item.summary)) {
    const summary = item.summary
      .map((part) => {
        if (!part || typeof part !== 'object') return '';
        if (typeof part.text === 'string') return part.text;
        return '';
      })
      .filter(Boolean)
      .join('\n');
    if (summary) return summary;
  }
  if (Array.isArray(item.content)) {
    const contentText = textFromContentParts(item.content);
    if (contentText) return contentText;
  }
  return '';
}

function appendAssistantMessage(messages, text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return;

  const last = messages[messages.length - 1];
  if (last && last.role === 'assistant' && typeof last.content === 'string' && !last.tool_calls) {
    last.content = `${last.content}\n${trimmed}`.trim();
    return;
  }

  messages.push({ role: 'assistant', content: trimmed });
}

function normalizeSingleContentPart(part) {
  const normalized = normalizeContentParts([part]);
  return Array.isArray(normalized) ? normalized[0] : part;
}

function stringifyToolResultContent(content) {
  if (typeof content === 'string') return content;
  const normalized = normalizeContentParts(content);
  const text = textFromContentParts(normalized);
  if (text) return text;
  return JSON.stringify(normalized || '');
}

function convertChatMessagesToUpstreamMessages(inputMessages) {
  if (!Array.isArray(inputMessages)) return inputMessages;

  const messages = [];

  for (const message of inputMessages) {
    if (!message || !message.role) continue;

    if (!Array.isArray(message.content)) {
      messages.push({ role: message.role, content: message.content });
      continue;
    }

    if (message.role === 'assistant') {
      const textParts = [];
      const toolCalls = [];

      for (const part of message.content) {
        if (!part || typeof part !== 'object') continue;

        if (part.type === 'tool_use') {
          toolCalls.push({
            id: part.id || `call_${toolCalls.length}`,
            type: 'function',
            function: {
              name: part.name || '',
              arguments: typeof part.input === 'string' ? part.input : JSON.stringify(part.input || {}),
            },
          });
          continue;
        }

        const normalizedPart = normalizeSingleContentPart(part);
        if (normalizedPart && normalizedPart.type === 'text' && typeof normalizedPart.text === 'string') {
          textParts.push(normalizedPart.text);
        }
      }

      const assistantMsg = { role: 'assistant', content: textParts.join('\n') || null };
      if (toolCalls.length > 0) {
        assistantMsg.tool_calls = toolCalls;
      }
      messages.push(assistantMsg);
      continue;
    }

    if (message.role === 'user') {
      const pendingUserParts = [];
      const flushUserParts = () => {
        if (pendingUserParts.length === 0) return;
        messages.push({ role: 'user', content: pendingUserParts.splice(0, pendingUserParts.length) });
      };

      for (const part of message.content) {
        if (!part || typeof part !== 'object') continue;

        if (part.type === 'tool_result') {
          flushUserParts();
          messages.push({
            role: 'tool',
            tool_call_id: part.tool_use_id || part.tool_call_id || part.id,
            content: stringifyToolResultContent(part.content),
          });
          continue;
        }

        const normalizedPart = normalizeSingleContentPart(part);
        if (normalizedPart) {
          pendingUserParts.push(normalizedPart);
        }
      }

      flushUserParts();
      continue;
    }

    messages.push({ role: message.role, content: normalizeContentParts(message.content) });
  }

  return messages;
}

function convertInputToMessages(input, instructions) {
  const messages = [];

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

    if (item.role && item.content !== undefined && !item.type) {
      if (item.role === 'assistant') {
        const text = textFromContentParts(item.content);
        const assistantMsg = { role: 'assistant', content: text || null };
        if (Array.isArray(item.tool_calls) && item.tool_calls.length > 0) {
          assistantMsg.tool_calls = item.tool_calls;
        }
        messages.push(assistantMsg);
      } else {
        messages.push({ role: item.role, content: normalizeContentParts(item.content) });
      }
      continue;
    }

    if (item.type === 'message' && item.role) {
      if (item.role === 'assistant') {
        const text = textFromContentParts(item.content);
        const assistantMsg = { role: 'assistant', content: text || null };
        if (Array.isArray(item.tool_calls) && item.tool_calls.length > 0) {
          assistantMsg.tool_calls = item.tool_calls;
        }
        messages.push(assistantMsg);
      } else {
        messages.push({ role: item.role, content: normalizeContentParts(item.content) });
      }
      continue;
    }

    if (item.type === 'reasoning' || item.type === 'reasoning_summary') {
      appendAssistantMessage(messages, extractReasoningText(item));
      continue;
    }

    if (item.type === 'function_call') {
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

    if (item.type === 'function_call_output') {
      messages.push({
        role: 'tool',
        tool_call_id: item.call_id || item.id,
        content: typeof item.output === 'string' ? item.output : JSON.stringify(item.output || ''),
      });
      continue;
    }

    if (item.role) {
      messages.push({ role: item.role, content: item.content || '' });
    }
  }

  return messages;
}

function convertToolsFormat(tools) {
  if (!Array.isArray(tools)) return undefined;

  return tools
    .filter((tool) => tool && typeof tool === 'object')
    .map((tool) => {
      // 已经是标准 Chat Completions 格式 {type:"function", function:{name,...}}
      if (tool.type === 'function' && tool.function && tool.function.name) {
        return tool;
      }

      // Responses API 格式或其他格式：提取 name 包装成 function 格式
      const name = tool.name || tool.function?.name || '';
      if (!name) return null; // 没有 name 的跳过

      const fn = { name };
      // Cursor 用 input_schema（Responses API 格式），上游需要 parameters
      const params = tool.input_schema || tool.parameters || tool.function?.parameters || { type: 'object', properties: {} };
      fn.parameters = params;
      const desc = tool.description || tool.function?.description;
      if (desc) fn.description = desc;
      if (tool.strict !== undefined) fn.strict = tool.strict;

      return { type: 'function', function: fn };
    })
    .filter(Boolean);
}

function fixMaxTokens(body) {
  if (!body || !body.model) return false;
  if (!body.max_tokens || body.max_completion_tokens) return false;

  if (MODELS_REQUIRING_MAX_COMPLETION_TOKENS.test(body.model)) {
    body.max_completion_tokens = body.max_tokens;
    delete body.max_tokens;
    return true;
  }
  return false;
}

function fixReasoningWithTools(body) {
  if (!body || !body.model || !body.reasoning_effort) return false;
  if (!Array.isArray(body.tools) || body.tools.length === 0) return false;

  if (/^(gpt-5|o1|o3)/i.test(body.model)) {
    delete body.reasoning_effort;
    return true;
  }
  return false;
}

function normalizeMessagesContentTypes(body) {
  if (!Array.isArray(body.messages)) return false;

  let changed = false;
  for (const message of body.messages) {
    if (!Array.isArray(message.content)) continue;
    const normalized = normalizeContentParts(message.content);
    if (JSON.stringify(normalized) !== JSON.stringify(message.content)) {
      message.content = normalized;
      changed = true;
    }
  }
  return changed;
}

function buildUpstreamBody(body) {
  const converted = {};
  const chatFields = [
    'model', 'stream', 'temperature', 'top_p', 'n', 'stop',
    'frequency_penalty', 'presence_penalty', 'logit_bias',
    'user', 'seed', 'logprobs', 'top_logprobs',
    'parallel_tool_calls', 'tool_choice', 'service_tier',
  ];

  for (const field of chatFields) {
    if (body[field] !== undefined) converted[field] = body[field];
  }

  // Apply model name mapping
  if (converted.model) {
    const mapped = mapModel(converted.model);
    if (mapped !== converted.model) {
      console.log(`[cursor-proxy] Model mapped: ${converted.model} -> ${mapped}`);
      converted.model = mapped;
    }
  }

  // Normalize tool_choice: Responses API sends object {type:"auto"}, Chat Completions wants string "auto"
  if (converted.tool_choice && typeof converted.tool_choice === 'object') {
    const tc = converted.tool_choice;
    if (tc.type === 'auto' || tc.type === 'none' || tc.type === 'required') {
      console.log(`[cursor-proxy] tool_choice normalized: ${JSON.stringify(tc)} -> "${tc.type}"`);
      converted.tool_choice = tc.type;
    } else if (tc.type === 'function' && tc.function) {
      // {type:"function", function:{name:"xxx"}} is valid for Chat Completions, keep as-is
    } else if (tc.type) {
      converted.tool_choice = tc.type;
    }
  }

  if (body.messages) {
    converted.messages = convertChatMessagesToUpstreamMessages(body.messages);
  } else if (body.input !== undefined) {
    converted.messages = convertInputToMessages(body.input, body.instructions);
  }

  if (body.tools) {
    console.log(`[cursor-proxy] Tools input: count=${body.tools.length} | types=${[...new Set(body.tools.map(t => t?.type))].join(',')} | first=${JSON.stringify(body.tools[0]).substring(0, 200)}`);
    const tools = convertToolsFormat(body.tools);
    console.log(`[cursor-proxy] Tools converted: count=${tools ? tools.length : 0}`);
    if (tools && tools.length > 0) {
      converted.tools = tools;
    } else {
      // tools 转换后为空，必须同时删除 tool_choice，否则上游报错
      console.log(`[cursor-proxy] WARNING: all tools filtered out, removing tool_choice`);
      delete converted.tool_choice;
    }
  } else if (converted.tool_choice) {
    // 没有 tools 但有 tool_choice，删除避免上游报错
    delete converted.tool_choice;
  }

  if (body.reasoning && typeof body.reasoning === 'object' && body.reasoning.effort) {
    converted.reasoning_effort = body.reasoning.effort;
  } else if (body.reasoning_effort) {
    converted.reasoning_effort = body.reasoning_effort;
  }

  if (body.text && typeof body.text === 'object' && body.text.format) {
    converted.response_format = body.text.format;
  } else if (body.response_format) {
    converted.response_format = body.response_format;
  }

  if (body.max_output_tokens !== undefined) {
    converted.max_completion_tokens = body.max_output_tokens;
  } else if (body.max_completion_tokens !== undefined) {
    converted.max_completion_tokens = body.max_completion_tokens;
  } else if (body.max_tokens !== undefined) {
    converted.max_tokens = body.max_tokens;
  }

  if (body.stream && body.stream_options) {
    converted.stream_options = { include_usage: !!body.stream_options.include_usage };
  }

  normalizeMessagesContentTypes(converted);
  fixMaxTokens(converted);
  fixReasoningWithTools(converted);
  return converted;
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    const MAX_BODY = 10 * 1024 * 1024;

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

function writeJson(res, statusCode, data, extraHeaders) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(body),
    ...extraHeaders,
  });
  res.end(body);
}

function proxyPassthrough(req, res, bodyOverride) {
  const options = {
    hostname: UPSTREAM_HOST,
    port: UPSTREAM_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers },
  };

  delete options.headers.host;
  if (bodyOverride !== null) {
    options.headers['content-length'] = Buffer.byteLength(bodyOverride);
  }

  const upstreamReq = http.request(options, (upstreamRes) => {
    res.writeHead(upstreamRes.statusCode, upstreamRes.headers);
    upstreamRes.pipe(res, { end: true });
  });

  upstreamReq.on('error', (err) => {
    writeJson(res, 502, { error: { message: err.message, type: 'proxy_error' } });
  });

  if (bodyOverride !== null) {
    upstreamReq.end(bodyOverride);
  } else {
    req.pipe(upstreamReq, { end: true });
  }
}

function isCursorLikeRequest(req, body) {
  const ua = String(req.headers['user-agent'] || '');
  if (body && body.input !== undefined) return true;
  if (body && body.previous_response_id) return true;
  if (body && body.text && body.text.format) return true;
  if (ua.includes('Go-http-client/2.0')) return true;
  return false;
}

function detectCursorDialect(body) {
  if (!body || typeof body !== 'object') return 'unknown';
  if (body.input !== undefined) return 'responses';
  if (body.previous_response_id) return 'responses';
  if (body.text && typeof body.text === 'object' && body.text.format) return 'responses';
  if (Array.isArray(body.messages)) return 'chat';
  return 'unknown';
}

function hasFunctionCallItems(outputItems) {
  return Array.isArray(outputItems) && outputItems.some((item) => item && item.type === 'function_call');
}

function mapUsage(usage) {
  if (!usage) return null;
  return {
    input_tokens: usage.prompt_tokens || 0,
    input_tokens_details: {
      cached_tokens: usage.prompt_tokens_details?.cached_tokens || 0,
    },
    output_tokens: usage.completion_tokens || 0,
    output_tokens_details: {
      reasoning_tokens: usage.completion_tokens_details?.reasoning_tokens || 0,
    },
    total_tokens: usage.total_tokens || ((usage.prompt_tokens || 0) + (usage.completion_tokens || 0)),
  };
}

function mapFinishReasonToStatus(finishReason) {
  if (finishReason === 'length') return 'incomplete';
  return 'completed';
}

function mapFinishReasonToIncompleteDetails(finishReason) {
  if (finishReason === 'length') {
    return { reason: 'max_output_tokens' };
  }
  return null;
}

function buildResponseEnvelope(reqBody, state) {
  const status = state.done ? mapFinishReasonToStatus(state.finishReason) : 'in_progress';
  const isToolTurn = hasFunctionCallItems(state.outputItems) || state.finishReason === 'tool_calls';
  return {
    id: state.responseId,
    object: 'response',
    created_at: state.createdAt,
    status,
    completed_at: state.done ? nowSeconds() : null,
    error: null,
    incomplete_details: state.done ? mapFinishReasonToIncompleteDetails(state.finishReason) : null,
    instructions: reqBody.instructions || null,
    max_output_tokens: reqBody.max_output_tokens ?? reqBody.max_completion_tokens ?? reqBody.max_tokens ?? null,
    model: reqBody.model,
    output: state.outputItems,
    output_text: isToolTurn ? '' : state.messageText,
    parallel_tool_calls: reqBody.parallel_tool_calls ?? true,
    previous_response_id: reqBody.previous_response_id || null,
    reasoning: reqBody.reasoning || { effort: null, summary: null },
    store: reqBody.store ?? true,
    temperature: reqBody.temperature ?? 1,
    text: reqBody.text || { format: { type: 'text' } },
    tool_choice: (() => {
      const tc = reqBody.tool_choice;
      if (!tc) return 'auto';
      if (typeof tc === 'string') return tc;
      if (tc.type === 'auto' || tc.type === 'none' || tc.type === 'required') return tc.type;
      return tc;
    })(),
    tools: reqBody.tools || [],
    top_p: reqBody.top_p ?? 1,
    truncation: reqBody.truncation || 'disabled',
    usage: mapUsage(state.usage),
    user: reqBody.user || null,
    metadata: reqBody.metadata || {},
  };
}

function buildNonStreamingResponse(chatResponse, reqBody) {
  const choice = chatResponse.choices?.[0] || {};
  const message = choice.message || {};
  const outputItems = [];
  const messageText = typeof message.content === 'string' ? message.content : '';
  const hasToolCalls = Array.isArray(message.tool_calls) && message.tool_calls.length > 0;

  if (messageText && !hasToolCalls) {
    outputItems.push({
      id: makeId('msg'),
      object: 'response.item',
      type: 'message',
      role: 'assistant',
      status: 'completed',
      content: [{ type: 'output_text', text: messageText, annotations: [] }],
    });
  }

  for (const toolCall of message.tool_calls || []) {
    outputItems.push({
      id: makeId('fc'),
      object: 'response.item',
      type: 'function_call',
      status: 'completed',
      call_id: toolCall.id,
      name: toolCall.function?.name || '',
      arguments: toolCall.function?.arguments || '',
    });
  }

  const state = {
    responseId: chatResponse.id ? `resp_${chatResponse.id.replace(/[^a-zA-Z0-9]/g, '')}` : makeId('resp'),
    createdAt: chatResponse.created || nowSeconds(),
    outputItems,
    messageText: hasToolCalls ? '' : messageText,
    usage: chatResponse.usage || null,
    finishReason: choice.finish_reason || 'stop',
    done: true,
  };

  return buildResponseEnvelope(reqBody, state);
}

function createSseWriter(res) {
  return (event) => {
    res.write(`event: ${event.type}\n`);
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };
}

function passthroughStreamingResponse(upstreamRes, clientRes) {
  const forwardHeaders = { ...upstreamRes.headers };
  delete forwardHeaders['content-length'];
  clientRes.writeHead(upstreamRes.statusCode || 200, forwardHeaders);
  upstreamRes.pipe(clientRes);
}

/**
 * Cursor 的 `/v1/chat/completions` 路径虽然会发送 Responses 风格的请求体（input/tools），
 * 但实际期望收到的是 Chat Completions SSE（choices[].delta）。
 *
 * 另外，Cursor 在 assistant 文本 + tool_calls 同时出现时，常会只显示文本而忽略工具调用，
 * 导致后续把“我要先读文件”这类前置文本再次发回模型，形成循环。
 *
 * 因此这里做两件事：
 * 1. 将上游 Chat Completions SSE 重新整理后，继续以 Chat Completions SSE 返回给 Cursor
 * 2. 若本轮存在 tool_calls，则抑制同轮的普通文本，只保留纯工具调用事件
 */
function bridgeResponsesToChatCompletionsStream(upstreamRes, clientRes, reqBody) {
  const forwardHeaders = { ...upstreamRes.headers };
  delete forwardHeaders['transfer-encoding'];
  delete forwardHeaders['content-length'];
  forwardHeaders['content-type'] = 'text/event-stream; charset=utf-8';
  forwardHeaders['cache-control'] = 'no-cache, no-transform';
  forwardHeaders['x-accel-buffering'] = 'no';

  clientRes.writeHead(upstreamRes.statusCode || 200, forwardHeaders);

  const state = {
    chatId: makeId('chatcmpl'),
    createdAt: nowSeconds(),
    model: reqBody.model || 'gpt-4',
    messageText: '',
    finishReason: 'stop',
    usage: null,
    sawToolCalls: false,
    toolCalls: new Map(),
    done: false,
  };

  function emitChatChunk(delta, finishReason = null, usage = undefined) {
    const payload = {
      id: state.chatId,
      object: 'chat.completion.chunk',
      created: state.createdAt,
      model: state.model,
      choices: [
        {
          index: 0,
          delta,
          finish_reason: finishReason,
        },
      ],
    };
    if (usage) {
      payload.usage = usage;
    }
    clientRes.write(`data: ${JSON.stringify(payload)}\n\n`);
  }

  function getToolCall(index) {
    if (state.toolCalls.has(index)) return state.toolCalls.get(index);
    const call = {
      index,
      id: makeId('call'),
      name: '',
      arguments: '',
    };
    state.toolCalls.set(index, call);
    return call;
  }

  function finalize() {
    if (state.done) return;
    state.done = true;

    if (state.sawToolCalls || state.finishReason === 'tool_calls') {
      const toolCalls = [...state.toolCalls.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([, call]) => call);

      toolCalls.forEach((call, idx) => {
        emitChatChunk({
          ...(idx === 0 ? { role: 'assistant' } : {}),
          tool_calls: [
            {
              index: call.index,
              id: call.id,
              type: 'function',
              function: {
                name: call.name,
                arguments: '',
              },
            },
          ],
        });

        if (call.arguments) {
          emitChatChunk({
            tool_calls: [
              {
                index: call.index,
                id: call.id,
                type: 'function',
                function: {
                  arguments: call.arguments,
                },
              },
            ],
          });
        }
      });

      console.log(`[cursor-proxy] Chat bridge final | toolCalls=${toolCalls.length} | suppressedText=${state.messageText.length}chars | finishReason=${state.finishReason}`);
      emitChatChunk({}, 'tool_calls', state.usage);
    } else {
      const text = state.messageText || '';
      emitChatChunk({ role: 'assistant', content: text });
      console.log(`[cursor-proxy] Chat bridge final | text=${text.length}chars | finishReason=${state.finishReason}`);
      emitChatChunk({}, state.finishReason === 'length' ? 'length' : 'stop', state.usage);
    }

    clientRes.write('data: [DONE]\n\n');
    clientRes.end();
  }

  const parse = createSseParser((data) => {
    if (data === '[DONE]') {
      finalize();
      return;
    }

    const chunk = safeJsonParse(data);
    if (!chunk) return;

    if (chunk.id) state.chatId = chunk.id;
    if (chunk.created) state.createdAt = chunk.created;
    if (chunk.model) state.model = chunk.model;
    if (chunk.usage) state.usage = chunk.usage;

    for (const choice of chunk.choices || []) {
      if (choice.finish_reason) {
        state.finishReason = choice.finish_reason;
      }

      const delta = choice.delta || {};
      if (typeof delta.content === 'string' && delta.content.length > 0) {
        state.messageText += delta.content;
      }

      for (const toolDelta of delta.tool_calls || []) {
        state.sawToolCalls = true;
        const call = getToolCall(toolDelta.index != null ? toolDelta.index : 0);
        if (toolDelta.id) call.id = toolDelta.id;
        if (toolDelta.function?.name) call.name += toolDelta.function.name;
        if (toolDelta.function?.arguments) call.arguments += toolDelta.function.arguments;
      }
    }
  });

  upstreamRes.on('data', parse);
  upstreamRes.on('end', finalize);
  upstreamRes.on('error', finalize);
}

/**
 * 增强透传：先原样转发所有 Chat Completions SSE 事件，
 * 在流结束后注入 Responses API 的 response.completed 事件，
 * 让 Cursor 在 Responses 方言下知道模型已经完成回答。
 */
function enhancedPassthroughStreamingResponse(upstreamRes, clientRes, reqBody) {
  const forwardHeaders = { ...upstreamRes.headers };
  delete forwardHeaders['content-length'];
  forwardHeaders['cache-control'] = 'no-cache, no-transform';
  forwardHeaders['x-accel-buffering'] = 'no';
  clientRes.writeHead(upstreamRes.statusCode || 200, forwardHeaders);

  const state = {
    responseId: makeId('resp'),
    createdAt: nowSeconds(),
    finishReason: 'stop',
    usage: null,
    messageText: '',
    toolCalls: [],
    done: false,
  };

  let seqNum = 0;
  function nextSeq() { return ++seqNum; }

  function writeResponseEvent(type, payload) {
    const event = { type, sequence_number: nextSeq(), ...payload };
    clientRes.write(`event: ${type}\ndata: ${JSON.stringify(event)}\n\n`);
  }

  const parse = createSseParser((data) => {
    if (data === '[DONE]') {
      if (!state.done) {
        state.done = true;
        const outputItems = [];
        const isToolTurn = state.toolCalls.length > 0;

        // 注入完整的 Responses API 工具调用事件序列
        if (isToolTurn) {
          for (let i = 0; i < state.toolCalls.length; i++) {
            const tc = state.toolCalls[i];
            const itemId = makeId('fc');
            const callId = tc.id || makeId('call');
            const name = tc.function?.name || '';
            const args = tc.function?.arguments || '';

            const item = {
              id: itemId,
              object: 'response.item',
              type: 'function_call',
              status: 'completed',
              call_id: callId,
              name,
              arguments: args,
            };
            outputItems.push(item);

            // 1. output_item.added
            writeResponseEvent('response.output_item.added', {
              response_id: state.responseId,
              output_index: i,
              item: { ...item, status: 'in_progress', arguments: '' },
            });

            // 2. function_call_arguments.done (skip deltas, send complete args at once)
            writeResponseEvent('response.function_call_arguments.done', {
              response_id: state.responseId,
              item_id: itemId,
              output_index: i,
              call_id: callId,
              name,
              arguments: args,
              item,
            });

            // 3. output_item.done
            writeResponseEvent('response.output_item.done', {
              response_id: state.responseId,
              output_index: i,
              item,
            });

            console.log(`[cursor-proxy] Injected tool events: name=${name} callId=${callId} args=${args.length}chars`);
          }
        } else if (state.messageText) {
          const msgId = makeId('msg');
          outputItems.push({
            id: msgId,
            object: 'response.item',
            type: 'message',
            role: 'assistant',
            status: 'completed',
            content: [{ type: 'output_text', text: state.messageText, annotations: [] }],
          });
        }

        // 4. response.completed 信封
        const completedStatus = state.finishReason === 'length' ? 'incomplete' : 'completed';
        const envelope = {
          id: state.responseId,
          object: 'response',
          created_at: state.createdAt,
          status: completedStatus,
          completed_at: nowSeconds(),
          error: null,
          incomplete_details: state.finishReason === 'length' ? { reason: 'max_output_tokens' } : null,
          instructions: reqBody.instructions || null,
          max_output_tokens: reqBody.max_output_tokens ?? reqBody.max_completion_tokens ?? reqBody.max_tokens ?? null,
          model: reqBody.model,
          output: outputItems,
          output_text: isToolTurn ? '' : state.messageText,
          parallel_tool_calls: reqBody.parallel_tool_calls ?? true,
          previous_response_id: reqBody.previous_response_id || null,
          reasoning: reqBody.reasoning || { effort: null, summary: null },
          store: reqBody.store ?? true,
          temperature: reqBody.temperature ?? 1,
          text: reqBody.text || { format: { type: 'text' } },
          tool_choice: 'auto',
          tools: reqBody.tools || [],
          top_p: reqBody.top_p ?? 1,
          truncation: reqBody.truncation || 'disabled',
          usage: mapUsage(state.usage),
          user: reqBody.user || null,
          metadata: reqBody.metadata || {},
        };

        const terminalType = state.finishReason === 'length' ? 'response.incomplete' : 'response.completed';
        console.log(`[cursor-proxy] Injecting ${terminalType} | outputItems=${outputItems.length} | finishReason=${state.finishReason} | text=${state.messageText.length}chars | tools=${state.toolCalls.length}`);
        writeResponseEvent(terminalType, { response: envelope });
      }
      // 转发原始 [DONE]
      clientRes.write('data: [DONE]\n\n');
      clientRes.end();
      return;
    }

    const chunk = safeJsonParse(data);
    if (chunk) {
      if (chunk.usage) state.usage = chunk.usage;
      for (const choice of chunk.choices || []) {
        if (choice.finish_reason) state.finishReason = choice.finish_reason;
        const delta = choice.delta || {};
        if (typeof delta.content === 'string') state.messageText += delta.content;
        for (const tc of delta.tool_calls || []) {
          const idx = tc.index != null ? tc.index : 0;
          if (!state.toolCalls[idx]) {
            state.toolCalls[idx] = { id: tc.id || '', function: { name: '', arguments: '' } };
          }
          if (tc.id) state.toolCalls[idx].id = tc.id;
          if (tc.function?.name) state.toolCalls[idx].function.name += tc.function.name;
          if (tc.function?.arguments) state.toolCalls[idx].function.arguments += tc.function.arguments;
        }
      }
    }
  });

  // 同时透传原始数据给客户端 + 解析状态
  upstreamRes.on('data', (chunk) => {
    clientRes.write(chunk);
    parse(chunk);
  });
  upstreamRes.on('end', () => {
    if (!state.done) {
      state.done = true;
      clientRes.end();
    }
  });
  upstreamRes.on('error', () => {
    clientRes.end();
  });
}

function createSseParser(onEvent) {
  let buffer = '';

  return (chunk) => {
    buffer += chunk.toString('utf8');
    while (true) {
      const sepIndex = buffer.indexOf('\n\n');
      if (sepIndex === -1) break;

      const rawEvent = buffer.slice(0, sepIndex);
      buffer = buffer.slice(sepIndex + 2);

      const lines = rawEvent.split('\n');
      const dataLines = [];
      for (const line of lines) {
        if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trimStart());
        }
      }
      const data = dataLines.join('\n');
      if (data) onEvent(data);
    }
  };
}

function handleCursorStreamingResponse(upstreamRes, clientRes, reqBody) {
  // 转发 upstream 响应头，并强制 SSE 必要头
  const forwardHeaders = { ...upstreamRes.headers };
  delete forwardHeaders['transfer-encoding']; // 不透传 chunked（Node.js 自己管）
  delete forwardHeaders['content-length'];
  forwardHeaders['content-type'] = 'text/event-stream; charset=utf-8';
  forwardHeaders['cache-control'] = 'no-cache, no-transform';
  forwardHeaders['x-accel-buffering'] = 'no';

  clientRes.writeHead(upstreamRes.statusCode || 200, forwardHeaders);

  const writeEvent = createSseWriter(clientRes);
  const state = {
    responseId: makeId('resp'),
    createdAt: nowSeconds(),
    usage: null,
    finishReason: 'stop',
    done: false,
    outputItems: [],
    messageItem: null,
    messageOutputIndex: null,
    messageText: '',
    textContentStarted: false,
    toolCalls: new Map(),
    nextOutputIndex: 0,
    sequenceNumber: 0,
  };

  function nextSequence() {
    state.sequenceNumber += 1;
    return state.sequenceNumber;
  }

  function emit(type, payload) {
    const lifecycleEvents = new Set([
      'response.created',
      'response.in_progress',
      'response.completed',
      'response.incomplete',
      'response.failed',
      'response.queued',
    ]);
    const finalPayload = lifecycleEvents.has(type)
      ? payload
      : { response_id: state.responseId, ...payload };
    if (type.startsWith('response.function_call') || type === 'response.output_item.added' || type === 'response.output_item.done') {
      const preview = JSON.stringify({ type, ...finalPayload }).substring(0, 400);
      console.log(`[cursor-proxy] emit ${preview}`);
    }
    writeEvent({ type, sequence_number: nextSequence(), ...finalPayload });
  }

  function ensureMessageItem() {
    if (state.messageItem) return state.messageItem;
    const item = {
      id: makeId('msg'),
      object: 'response.item',
      type: 'message',
      role: 'assistant',
      status: 'in_progress',
      content: [],
    };
    const outputIndex = state.nextOutputIndex;
    state.nextOutputIndex += 1;
    state.messageOutputIndex = outputIndex;
    state.messageItem = item;
    state.outputItems.push(item);
    emit('response.output_item.added', {
      output_index: outputIndex,
      item: {
        id: item.id,
        object: 'response.item',
        type: item.type,
        role: item.role,
        status: item.status,
        content: [],
      },
    });
    return item;
  }

  function ensureTextPart() {
    if (state.textContentStarted) return;
    const item = ensureMessageItem();
    item.content.push({ type: 'output_text', text: '', annotations: [] });
    state.textContentStarted = true;
    emit('response.content_part.added', {
      item_id: item.id,
      output_index: state.messageOutputIndex,
      content_index: 0,
      part: { type: 'output_text', text: '', annotations: [] },
    });
  }

  function getToolCall(index) {
    if (state.toolCalls.has(index)) return state.toolCalls.get(index);
    const call = {
      itemId: makeId('fc'),
      callId: makeId('call'),
      name: '',
      arguments: '',
      argumentDeltas: [],
      emittedArgumentDeltas: 0,
      outputIndex: state.nextOutputIndex,
      added: false,
      done: false,
    };
    state.nextOutputIndex += 1;
    state.toolCalls.set(index, call);
    return call;
  }

  function emitToolAdded(call) {
    if (call.added) return;
    if (!call.name) return; // 等获得 name 后再 emit
    call.added = true;
    console.log(`[cursor-proxy] emitToolAdded: itemId=${call.itemId} callId=${call.callId} name=${call.name} outputIndex=${call.outputIndex}`);
    state.outputItems.push({
      id: call.itemId,
      object: 'response.item',
      type: 'function_call',
      status: 'in_progress',
      call_id: call.callId,
      name: call.name,
      arguments: call.arguments,
    });
    emit('response.output_item.added', {
      output_index: call.outputIndex,
      item: {
        id: call.itemId,
        object: 'response.item',
        type: 'function_call',
        status: 'in_progress',
        call_id: call.callId,
        name: call.name,
        arguments: '',
      },
    });
  }

  function finalizeToolCall(call) {
    if (call.done) return;
    call.done = true;
    emitToolAdded(call); // 确保已 emit output_item.added
    const item = state.outputItems.find((outputItem) => outputItem.id === call.itemId);
    if (item) {
      item.status = 'completed';
      item.name = call.name;
      item.arguments = call.arguments;
      item.call_id = call.callId;
    }

    const argumentDeltas = call.emittedArgumentDeltas > 0
      ? []
      : (call.argumentDeltas.length > 0 ? call.argumentDeltas : (call.arguments ? [call.arguments] : []));
    for (const delta of argumentDeltas) {
      emit('response.function_call_arguments.delta', {
        item_id: call.itemId,
        output_index: call.outputIndex,
        call_id: call.callId,
        delta,
      });
    }

    emit('response.function_call_arguments.done', {
      item_id: call.itemId,
      output_index: call.outputIndex,
      call_id: call.callId,
      name: call.name,
      arguments: call.arguments,
      item: {
        id: call.itemId,
        object: 'response.item',
        type: 'function_call',
        status: 'completed',
        call_id: call.callId,
        name: call.name,
        arguments: call.arguments,
      },
    });
    emit('response.output_item.done', {
      output_index: call.outputIndex,
      item: {
        id: call.itemId,
        object: 'response.item',
        type: 'function_call',
        status: 'completed',
        call_id: call.callId,
        name: call.name,
        arguments: call.arguments,
      },
    });
  }

  function finalizeStream() {
    if (state.done) return;
    state.done = true;
    console.log(`[cursor-proxy] Finalizing | text=${state.messageText.length}chars | toolCalls=${state.toolCalls.size} | finishReason=${state.finishReason} | eventsEmitted=${state.sequenceNumber}`);
    for (const [idx, call] of state.toolCalls) {
      console.log(`[cursor-proxy]   tool[${idx}]: name=${call.name} args=${call.arguments.length}chars callId=${call.callId}`);
    }

    // 先发工具调用事件（outputIndex 从 0 开始，符合 OpenAI 规范）
    for (const call of state.toolCalls.values()) {
      finalizeToolCall(call);
    }

    // 再发文本内容（如果有），文本消息放在工具调用之后
    if (state.messageText && state.toolCalls.size === 0) {
      // 在 finalizeStream 中创建消息 item（outputIndex 在工具之后）
      const msgItem = ensureMessageItem();
      if (!state.textContentStarted) {
        ensureTextPart();
      }
      const contentPart = msgItem.content[0] || { type: 'output_text', text: '', annotations: [] };
      contentPart.text = state.messageText;

        emit('response.output_text.delta', {
          item_id: msgItem.id,
          output_index: state.messageOutputIndex,
          content_index: 0,
          delta: state.messageText,
        });

      emit('response.output_text.done', {
        item_id: msgItem.id,
        output_index: state.messageOutputIndex,
        content_index: 0,
        text: state.messageText,
      });
      emit('response.content_part.done', {
        item_id: msgItem.id,
        output_index: state.messageOutputIndex,
        content_index: 0,
        part: { type: 'output_text', text: state.messageText, annotations: [] },
      });
      msgItem.status = 'completed';
      emit('response.output_item.done', {
        output_index: state.messageOutputIndex,
        item: {
          id: msgItem.id,
          object: 'response.item',
          type: 'message',
          role: 'assistant',
          status: 'completed',
          content: [{ type: 'output_text', text: state.messageText, annotations: [] }],
        },
      });
    }

    const envelope = buildResponseEnvelope(reqBody, state);
    console.log(`[cursor-proxy] response.completed output: ${JSON.stringify(envelope.output)}`);
    const terminalType = state.finishReason === 'length' ? 'response.incomplete' : 'response.completed';
    emit(terminalType, { response: envelope });
    clientRes.end();
  }

  emit('response.created', { response: buildResponseEnvelope(reqBody, state) });
  emit('response.in_progress', { response: buildResponseEnvelope(reqBody, state) });

  const parse = createSseParser((data) => {
    if (data === '[DONE]') {
      finalizeStream();
      return;
    }

    const chunk = safeJsonParse(data);
    if (!chunk) {
      console.log(`[cursor-proxy] SSE: unparseable data: ${data.substring(0, 200)}`);
      return;
    }

    if (chunk.usage) {
      state.usage = chunk.usage;
    }

    if (chunk.error) {
      console.log(`[cursor-proxy] SSE: upstream error in chunk: ${JSON.stringify(chunk.error).substring(0, 300)}`);
    }

    for (const choice of chunk.choices || []) {
      if (choice.finish_reason) {
        state.finishReason = choice.finish_reason;
        console.log(`[cursor-proxy] SSE: finish_reason=${choice.finish_reason}`);
      }

      const delta = choice.delta || {};
      if (!state._debugFirstDelta) {
        state._debugFirstDelta = true;
        console.log(`[cursor-proxy] SSE: first delta keys: ${Object.keys(delta).join(',')} | content type: ${typeof delta.content} | tool_calls: ${!!delta.tool_calls}`);
      }

      if (typeof delta.content === 'string' && delta.content.length > 0) {
        state.messageText += delta.content;
        // 缓冲文本内容，在 finalizeStream 中统一按规范顺序发出
        // 这样工具调用可以优先获得 outputIndex=0，符合 OpenAI 规范示例格式
      }

      for (const toolDelta of delta.tool_calls || []) {
        const call = getToolCall(toolDelta.index != null ? toolDelta.index : 0);
        if (toolDelta.id) call.callId = toolDelta.id;
        if (toolDelta.function?.name) call.name += toolDelta.function.name;
        if (call.name) {
          emitToolAdded(call);
        }
        if (toolDelta.function?.arguments) {
          call.arguments += toolDelta.function.arguments;
          call.argumentDeltas.push(toolDelta.function.arguments);
          if (call.added) {
            emit('response.function_call_arguments.delta', {
              item_id: call.itemId,
              output_index: call.outputIndex,
              call_id: call.callId,
              delta: toolDelta.function.arguments,
            });
            call.emittedArgumentDeltas += 1;
          }
        }
      }
    }
  });

  upstreamRes.on('data', parse);
  upstreamRes.on('end', finalizeStream);
  upstreamRes.on('error', () => finalizeStream());
}

function forwardCursorRequest(req, res, rawBody, body) {
  const dialect = detectCursorDialect(body);
  const upstreamBody = buildUpstreamBody(body);
  const finalBody = JSON.stringify(upstreamBody);
  const options = {
    hostname: UPSTREAM_HOST,
    port: UPSTREAM_PORT,
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      ...req.headers,
      'content-length': Buffer.byteLength(finalBody),
      'content-type': 'application/json',
    },
  };

  delete options.headers.host;

  const upstreamReq = http.request(options, (upstreamRes) => {
    const isStreaming = !!body.stream;
    const upstreamContentType = String(upstreamRes.headers['content-type'] || '');

    if (isStreaming && upstreamContentType.includes('text/event-stream')) {
      if (dialect === 'responses') {
        if (req.url && req.url.startsWith('/v1/responses')) {
          console.log('[cursor-proxy] Streaming response | True Responses API mode');
          handleCursorStreamingResponse(upstreamRes, res, body);
          return;
        }

        console.log('[cursor-proxy] Streaming response | Cursor chat bridge mode');
        bridgeResponsesToChatCompletionsStream(upstreamRes, res, body);
        return;
      }
      // Chat 方言：纯透传
      console.log(`[cursor-proxy] Streaming response | Chat Completions passthrough | dialect=${dialect}`);
      passthroughStreamingResponse(upstreamRes, res);
      return;
    }

    // Non-streaming: 统一透传 Chat Completions 响应
    const chunks = [];
    upstreamRes.on('data', (chunk) => chunks.push(chunk));
    upstreamRes.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      console.log(`[cursor-proxy] Non-streaming response | status=${upstreamRes.statusCode} | len=${text.length} | dialect=${dialect}`);

      const responseHeaders = { ...upstreamRes.headers };
      responseHeaders['content-length'] = Buffer.byteLength(text);
      res.writeHead(upstreamRes.statusCode || 200, responseHeaders);
      res.end(text);
    });
  });

  upstreamReq.on('error', (err) => {
    writeJson(res, 502, {
      error: { message: `upstream connection failed: ${err.message}`, type: 'proxy_error' },
    });
  });

  const ua = String(req.headers['user-agent'] || '');
  const toolCount = Array.isArray(body.tools) ? body.tools.length : 0;
  const inputCount = Array.isArray(body.input) ? body.input.length : (Array.isArray(body.messages) ? body.messages.length : 0);
  console.log(`[cursor-proxy] Cursor request | dialect=${dialect} | model=${body.model || 'unknown'} | stream=${!!body.stream} | tools=${toolCount} | inputItems=${inputCount} | ua=${ua.substring(0, 40)}`);
  console.log(`[cursor-proxy] Converted body keys: ${Object.keys(upstreamBody).join(',')}`);
  if (upstreamBody.messages) {
    console.log(`[cursor-proxy] Messages count: ${upstreamBody.messages.length}, last role: ${upstreamBody.messages[upstreamBody.messages.length-1]?.role}`);
    // 输出最后6条消息的结构（不含完整内容）
    const lastMsgs = upstreamBody.messages.slice(-6);
    for (let i = 0; i < lastMsgs.length; i++) {
      const m = lastMsgs[i];
      const idx = upstreamBody.messages.length - lastMsgs.length + i;
      const contentInfo = m.tool_calls
        ? `tool_calls=[${m.tool_calls.map(tc => `${tc.function?.name}(id=${tc.id})`).join(',')}] content=${typeof m.content === 'string' ? (m.content || '(null)').substring(0, 80) : JSON.stringify(m.content)}`
        : `content_type=${typeof m.content} content=${typeof m.content === 'string' ? m.content.substring(0, 80) : JSON.stringify(m.content)?.substring(0, 80)}`;
      console.log(`[cursor-proxy]   msg[${idx}]: role=${m.role}${m.tool_call_id ? ` tool_call_id=${m.tool_call_id}` : ''} | ${contentInfo}`);
    }
  }
  upstreamReq.end(finalBody);
}

const server = http.createServer(async (req, res) => {
  const isHandledPath = req.method === 'POST' && req.url && (
    req.url.startsWith('/v1/chat/completions') || req.url.startsWith('/v1/responses')
  );

  if (!isHandledPath) {
    return proxyPassthrough(req, res, null);
  }

  try {
    const rawBody = await collectBody(req);
    const ua = String(req.headers['user-agent'] || '');
    console.log(`[cursor-proxy] ${req.method} ${req.url} | ua=${ua.substring(0, 50)} | bodyLen=${rawBody.length}`);
    const body = safeJsonParse(rawBody);
    if (!body) {
      console.log(`[cursor-proxy] PASSTHROUGH: body not JSON`);
      return proxyPassthrough(req, res, rawBody);
    }

    if (!isCursorLikeRequest(req, body)) {
      console.log(`[cursor-proxy] PASSTHROUGH: not Cursor-like | hasInput=${body.input !== undefined} | hasMessages=${!!body.messages}`);
      return proxyPassthrough(req, res, rawBody);
    }

    console.log(`[cursor-proxy] REQUEST BODY (first 500): ${rawBody.substring(0, 500)}`);
    if (body.tools && Array.isArray(body.tools) && body.tools.length > 0) {
      console.log(`[cursor-proxy] TOOLS[0] raw: ${JSON.stringify(body.tools[0]).substring(0, 300)}`);
      console.log(`[cursor-proxy] TOOLS[0] keys: ${Object.keys(body.tools[0]).join(',')}`);
    }
    return forwardCursorRequest(req, res, rawBody, body);
  } catch (err) {
    writeJson(res, 500, {
      error: { message: `cursor proxy internal error: ${err.message}`, type: 'proxy_error' },
    });
  }
});

server.listen(LISTEN_PORT, '127.0.0.1', () => {
  console.log(`[cursor-proxy] listening on 127.0.0.1:${LISTEN_PORT}`);
  console.log(`[cursor-proxy] upstream: ${UPSTREAM_HOST}:${UPSTREAM_PORT}`);
  console.log('[cursor-proxy] mode: Cursor-only Responses compatibility layer');
});
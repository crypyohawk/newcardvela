#!/usr/bin/env python3
"""Patch copilot-api dist/main.js to fix max_tokens for gpt-5.4 models."""

import sys

TARGET = '/root/.npm/_npx/7d9acc9b18fee6ac/node_modules/copilot-api/dist/main.js'

with open(TARGET, 'r') as f:
    content = f.read()

# Original code block (lines 805-811):
old_code = """\tif (isNullish(payload.max_tokens)) {
\t\tpayload = {
\t\t\t...payload,
\t\t\tmax_tokens: selectedModel?.capabilities.limits.max_output_tokens
\t\t};
\t\tconsola.debug("Set max_tokens to:", JSON.stringify(payload.max_tokens));
\t}"""

new_code = """\t{
\t\tconst _m = (payload.model || '').toLowerCase();
\t\tconst _needs_mct = _m.includes('gpt-5.4') || _m.includes('gpt-5-4');
\t\tif (_needs_mct && payload.max_tokens && !payload.max_completion_tokens) {
\t\t\tpayload = { ...payload, max_completion_tokens: payload.max_tokens };
\t\t\tdelete payload.max_tokens;
\t\t\tconsola.debug("Converted max_tokens to max_completion_tokens for", _m);
\t\t}
\t\tif (isNullish(payload.max_tokens) && isNullish(payload.max_completion_tokens)) {
\t\t\tconst _maxOut = selectedModel?.capabilities.limits.max_output_tokens;
\t\t\tif (_needs_mct) {
\t\t\t\tpayload = { ...payload, max_completion_tokens: _maxOut };
\t\t\t\tconsola.debug("Set max_completion_tokens to:", JSON.stringify(payload.max_completion_tokens));
\t\t\t} else {
\t\t\t\tpayload = { ...payload, max_tokens: _maxOut };
\t\t\t\tconsola.debug("Set max_tokens to:", JSON.stringify(payload.max_tokens));
\t\t\t}
\t\t}
\t}"""

if old_code not in content:
    print("ERROR: Could not find the original code block to patch!")
    print("The file may have already been patched or the format changed.")
    sys.exit(1)

content = content.replace(old_code, new_code, 1)

with open(TARGET, 'w') as f:
    f.write(content)

print("SUCCESS: Patched copilot-api dist/main.js")
print("- gpt-5.4/gpt-5-4 models now use max_completion_tokens")
print("- Other models still use max_tokens (unchanged)")

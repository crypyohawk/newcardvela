import json
data = {
    "model": "gpt-5.4",
    "input": [
        {"role": "user", "content": [{"type": "input_text", "text": "say ok"}]}
    ],
    "stream": False
}
with open("/tmp/test-ct.json", "w") as f:
    json.dump(data, f)

# Also create a test with messages format + input_text (non-Responses API)
data2 = {
    "model": "gpt-5.4",
    "messages": [
        {"role": "user", "content": [{"type": "input_text", "text": "say ok"}]}
    ],
    "stream": False
}
with open("/tmp/test-ct2.json", "w") as f:
    json.dump(data2, f)

# Multi-turn with function calls
data3 = {
    "model": "gpt-5.4",
    "input": [
        {"role": "system", "content": "You are a helpful assistant"},
        {"role": "user", "content": [{"type": "input_text", "text": "say ok"}]},
        {"role": "assistant", "content": [{"type": "output_text", "text": "ok"}]},
        {"role": "user", "content": [{"type": "input_text", "text": "say hello"}]}
    ],
    "stream": False
}
with open("/tmp/test-ct3.json", "w") as f:
    json.dump(data3, f)

print("Created 3 test files")

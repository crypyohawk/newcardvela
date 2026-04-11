import json

# Test: reasoning_effort + tools + gpt-5.4 (Responses API format)
data = {
    "model": "gpt-5.4",
    "input": [
        {"role": "user", "content": [{"type": "input_text", "text": "What is 2+2?"}]}
    ],
    "reasoning": {"effort": "medium"},
    "tools": [
        {"type": "function", "name": "calculator", "description": "Calculate math", "parameters": {"type": "object", "properties": {"expr": {"type": "string"}}}}
    ],
    "stream": False
}
with open("/tmp/test-rt.json", "w") as f:
    json.dump(data, f)

# Test: reasoning_effort + tools + gpt-5.4 (standard messages format)
data2 = {
    "model": "gpt-5.4",
    "messages": [
        {"role": "user", "content": "What is 2+2?"}
    ],
    "reasoning_effort": "medium",
    "tools": [
        {"type": "function", "function": {"name": "calculator", "description": "Calculate math", "parameters": {"type": "object", "properties": {"expr": {"type": "string"}}}}}
    ],
    "stream": False
}
with open("/tmp/test-rt2.json", "w") as f:
    json.dump(data2, f)

print("Created test files")

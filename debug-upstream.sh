#!/bin/bash
# 排查 upstream error: do request failed

echo "=== 1. 检查 copilot-api 端口 ==="
ss -tlnp | grep 4141

echo ""
echo "=== 2. 直连 copilot-api 获取模型列表 ==="
curl -s http://127.0.0.1:4141/v1/models | python3 -c "import sys,json; [print(m['id']) for m in json.load(sys.stdin)['data']]"

echo ""
echo "=== 3. 直连 copilot-api 发聊天请求（绕过 new-api） ==="
curl -X POST http://127.0.0.1:4141/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-sonnet-4.6","messages":[{"role":"user","content":"hello"}],"max_tokens":50}'

echo ""
echo ""
echo "=== 4. 查看 new-api 的 Docker 网络模式 ==="
docker ps --format '{{.Names}} {{.Ports}}' | grep -i new

echo ""
echo "=== 5. 查看 Docker 宿主机 IP（给渠道 Base URL 用） ==="
ip addr show docker0 2>/dev/null | grep 'inet '

echo ""
echo "=== 6. 从 new-api 容器内测试能否连到宿主机 4141 ==="
# 先找到 new-api 容器名
CONTAINER=$(docker ps --format '{{.Names}}' | grep -i new-api | head -1)
if [ -n "$CONTAINER" ]; then
  echo "找到容器: $CONTAINER"
  echo "测试从容器内连 127.0.0.1:4141（预期失败）:"
  docker exec "$CONTAINER" wget -q -O- --timeout=3 http://127.0.0.1:4141/v1/models 2>&1 | head -5 || echo "连接失败（预期行为）"
  
  DOCKER_HOST_IP=$(ip addr show docker0 2>/dev/null | grep 'inet ' | awk '{print $2}' | cut -d/ -f1)
  if [ -n "$DOCKER_HOST_IP" ]; then
    echo ""
    echo "测试从容器内连 ${DOCKER_HOST_IP}:4141（应该成功）:"
    docker exec "$CONTAINER" wget -q -O- --timeout=3 "http://${DOCKER_HOST_IP}:4141/v1/models" 2>&1 | head -5 || echo "连接失败"
  fi
else
  echo "未找到 new-api 容器，手动检查: docker ps"
fi

echo ""
echo "=== 7. copilot-api 最近日志 ==="
tail -20 /home/ubuntu/copilot-pool/logs/copilot1.log

echo ""
echo "============================================"
echo "如果第6步确认 172.17.0.1:4141 能通，去 new-api 渠道管理把 Base URL 改成:"
echo "  http://172.17.0.1:4141"
echo "（把 127.0.0.1 替换成上面第5步显示的 docker0 IP）"
echo "============================================"

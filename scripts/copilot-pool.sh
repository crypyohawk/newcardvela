#!/bin/bash
# ============================================================
# Copilot API 多实例管理脚本
# 每个 Copilot 账号对应一个 copilot-api 实例
# 供 new-api 作为上游渠道使用
# ============================================================

COPILOT_DATA_DIR="/home/ubuntu/copilot-pool"
COPILOT_PORT_BASE=4141  # 实例端口从 4141 开始递增
PID_DIR="${COPILOT_DATA_DIR}/pids"
LOG_DIR="${COPILOT_DATA_DIR}/logs"

mkdir -p "$PID_DIR" "$LOG_DIR"

# 启动单个实例
start_instance() {
  local name="$1"
  local token="$2"
  local port="$3"
  local pid_file="${PID_DIR}/${name}.pid"
  local log_file="${LOG_DIR}/${name}.log"

  if [ -f "$pid_file" ] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
    echo "[${name}] 已在运行 (PID: $(cat "$pid_file"), Port: ${port})"
    return 0
  fi

  echo "[${name}] 启动中 → port=${port}"
  nohup npx copilot-api start --port "$port" --token "$token" > "$log_file" 2>&1 &
  local pid=$!
  echo "$pid" > "$pid_file"
  echo "[${name}] 已启动 (PID: ${pid}, Port: ${port})"
}

# 停止单个实例
stop_instance() {
  local name="$1"
  local pid_file="${PID_DIR}/${name}.pid"

  if [ -f "$pid_file" ]; then
    local pid=$(cat "$pid_file")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid"
      echo "[${name}] 已停止 (PID: ${pid})"
    fi
    rm -f "$pid_file"
  else
    echo "[${name}] 未在运行"
  fi
}

# 查看所有实例状态
status_all() {
  echo "========== Copilot API 实例状态 =========="
  for pid_file in "${PID_DIR}"/*.pid; do
    [ -f "$pid_file" ] || continue
    local name=$(basename "$pid_file" .pid)
    local pid=$(cat "$pid_file")
    if kill -0 "$pid" 2>/dev/null; then
      echo "  ✅ ${name} — PID: ${pid} — 运行中"
    else
      echo "  ❌ ${name} — PID: ${pid} — 已停止"
      rm -f "$pid_file"
    fi
  done
  echo "=========================================="
}

# 启动所有（从数据库读取账号列表）
start_all() {
  echo "从数据库读取账号列表..."
  # 用 Node.js 脚本从 PostgreSQL 读取活跃账号
  local accounts=$(node -e "
    const { PrismaClient } = require('@prisma/client');
    const p = new PrismaClient();
    p.copilotAccount.findMany({
      where: { status: { in: ['active', 'bound'] } },
      orderBy: [
        { port: 'asc' },
        { createdAt: 'asc' },
      ],
    })
      .then(accs => { console.log(JSON.stringify(accs)); p.\$disconnect(); })
      .catch(e => { console.error(e); process.exit(1); });
  ")

  echo "$accounts" | node -e "
    const accs = JSON.parse(require('fs').readFileSync(0, 'utf8'));
    const basePort = ${COPILOT_PORT_BASE};
    const usedPorts = new Set(
      accs
        .map(a => a.port)
        .filter(port => Number.isInteger(port) && port >= basePort)
    );
    let nextPort = basePort;

    const allocatePort = () => {
      while (usedPorts.has(nextPort)) nextPort++;
      const port = nextPort;
      usedPorts.add(port);
      nextPort++;
      return port;
    };

    accs.forEach((a, i) => {
      const port = Number.isInteger(a.port) && a.port >= basePort ? a.port : allocatePort();
      console.log(a.githubId + '|' + a.token + '|' + port);
    });
  " | while IFS='|' read -r name token port; do
    start_instance "$name" "$token" "$port"
  done
}

# 停止所有
stop_all() {
  for pid_file in "${PID_DIR}"/*.pid; do
    [ -f "$pid_file" ] || continue
    local name=$(basename "$pid_file" .pid)
    stop_instance "$name"
  done
}

# 命令分发
case "${1:-status}" in
  start)
    if [ -n "$2" ] && [ -n "$3" ] && [ -n "$4" ]; then
      start_instance "$2" "$3" "$4"
    else
      start_all
    fi
    ;;
  stop)
    if [ -n "$2" ]; then
      stop_instance "$2"
    else
      stop_all
    fi
    ;;
  restart)
    stop_all
    sleep 2
    start_all
    ;;
  status)
    status_all
    ;;
  *)
    echo "用法: $0 {start|stop|restart|status}"
    echo "  start                     — 启动所有活跃账号实例"
    echo "  start <name> <token> <port> — 启动单个实例"
    echo "  stop                      — 停止所有"
    echo "  stop <name>               — 停止单个"
    echo "  restart                   — 重启所有"
    echo "  status                    — 查看所有状态"
    ;;
esac
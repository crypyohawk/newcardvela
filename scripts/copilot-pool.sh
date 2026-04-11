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
DATA_DIR="${COPILOT_DATA_DIR}/data"  # 每个实例的独立数据目录

mkdir -p "$PID_DIR" "$LOG_DIR" "$DATA_DIR"

# 启动单个实例
start_instance() {
  local name="$1"
  local token="$2"
  local port="$3"
  local pid_file="${PID_DIR}/${name}.pid"
  local log_file="${LOG_DIR}/${name}.log"
  local instance_data="${DATA_DIR}/${name}"

  if [ -f "$pid_file" ] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
    echo "[${name}] 已在运行 (PID: $(cat "$pid_file"), Port: ${port})"
    return 0
  fi

  # 为每个实例创建独立的数据目录，避免 token 缓存互相覆盖
  mkdir -p "$instance_data"

  echo "[${name}] 启动中 → port=${port}"
  XDG_DATA_HOME="$instance_data" nohup npx copilot-api start --port "$port" --token "$token" > "$log_file" 2>&1 &
  local pid=$!
  echo "$pid" > "$pid_file"
  # 等待 node 子进程实际启动并监听端口
  local wait=0
  while ! ss -tlnp 2>/dev/null | grep -q ":${port} " && [ $wait -lt 15 ]; do
    sleep 1
    wait=$((wait + 1))
  done
  # 更新 PID 为实际监听端口的 node 进程
  local real_pid=$(ss -tlnp 2>/dev/null | grep ":${port} " | grep -oP 'pid=\K[0-9]+')
  if [ -n "$real_pid" ]; then
    echo "$real_pid" > "$pid_file"
    echo "[${name}] 已启动 (PID: ${real_pid}, Port: ${port})"
  else
    echo "[${name}] ⚠ 启动可能失败，请检查日志: ${log_file}"
  fi
}

# 停止单个实例
stop_instance() {
  local name="$1"
  local pid_file="${PID_DIR}/${name}.pid"

  if [ -f "$pid_file" ]; then
    local pid=$(cat "$pid_file")
    if kill -0 "$pid" 2>/dev/null; then
      # 杀掉进程组（npm + node 子进程）
      pkill -P "$pid" 2>/dev/null
      kill "$pid" 2>/dev/null
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
  # 清理所有残留的 copilot-api 进程（包括 npm 和 node 子进程）
  if pgrep -f "copilot-api" >/dev/null 2>&1; then
    echo "清理残留 copilot-api 进程..."
    pkill -f "copilot-api" 2>/dev/null
    sleep 2
    # 强杀所有残留
    pkill -9 -f "copilot-api" 2>/dev/null
    sleep 1
  fi
  # 确认端口已释放
  local retries=0
  while ss -tlnp | grep -qE ':414[0-9]' && [ $retries -lt 10 ]; do
    echo "等待端口释放..."
    sleep 1
    retries=$((retries + 1))
  done
  if ss -tlnp | grep -qE ':414[0-9]'; then
    echo "⚠ 仍有端口被占用，强制杀死占用进程"
    ss -tlnp | grep -oP ':414[0-9].*pid=\K[0-9]+' | sort -u | xargs -r kill -9 2>/dev/null
    sleep 1
  fi
  echo "所有实例已停止"
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
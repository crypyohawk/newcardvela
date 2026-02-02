<<<<<<< HEAD
# CardVela

部署要点：
- 本地测试：`npm run dev`
- 使用数据库（开发）：Docker PostgreSQL: `postgres://postgres:postgres123@localhost:5432/cardvela`
- 生产环境：在服务器 `C:\cardvela\.env` 填写 RDS 连接等敏感变量（不要提交到 git）

快速部署（服务器）：
1. 拉取代码：`git clone https://github.com/USERNAME/REPO.git C:\cardvela` 或 `git pull`
2. 安装：`npm install`
3. 数据库：`npx prisma db push`
4. 构建：`npm run build`
5. 复制静态：
   - `xcopy /E /I /Y ".next\static" ".next\standalone\.next\static"`
   - 如有 public：`xcopy /E /I /Y "public" ".next\standalone\public"`
6. 启动：
   - 开发：`npm run start`（注意 standalone 使用 `node .next/standalone/server.js`）
   - 推荐使用 pm2：`pm2 start .next/standalone/server.js --name cardvela`

回滚：
- 在服务器：`git checkout <commit>` → 重建并重启。
=======
# newcardvela
新仓库
>>>>>>> 2f2bb744d23aad9520549693c8413c7e075f21fa

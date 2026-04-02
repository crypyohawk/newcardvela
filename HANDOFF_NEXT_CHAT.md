# CardVela 新服务器交接

当前时间：2026-04-02

## 当前状态

- 新服务器 IP：23.106.142.166
- 主站 HTTP 已可访问
- 主站 HTTPS 已可访问
- API HTTP 已可访问
- cardvela.com 已解析到 23.106.142.166
- 主站证书已确认存在并已复用
- Nginx 已切换为“主站 HTTPS，API 暂时 HTTP”
- 浏览器已确认主站 HTTPS 正常
- 当前阶段：开始做主站业务联调
- GSalary 商户后台下一步需要切换 IP 白名单到新服务器

## 当前环境变量检查结果

注册验证码与发邮：

- 本地参考值已更新了一个待验证的 Resend key
- 当前仓库参考文件中的 RESEND_API_KEY 已不再是空
- 但服务器上的 /opt/cardvela/.env 也必须同步修改后才会真正生效
- 在服务器重启应用之前，注册验证码仍然只会打印到日志里

已确认可直接复用的旧值：

- RESEND_API_KEY
- GSALARY_APP_ID
- GSALARY_PRIVATE_KEY
- GSALARY_DEFAULT_CARD_HOLDER_ID

不建议现在直接覆盖的旧值：

- NEW_API_BASE_URL：服务器内部走 127.0.0.1 更稳，不用改成公网域名
- NEW_API_ADMIN_TOKEN：当前服务器值已经验证成功，先不要用旧值覆盖
- NEXT_PUBLIC_APP_URL：这是前端公开变量，改它通常要重新 build，先不动
- AI_API_BASE_URL：等 api.cardvela.com HTTPS 真正配好后再改

new-api 相关：

- NEW_API_BASE_URL 已配置为 http://127.0.0.1:3001
- NEW_API_ADMIN_TOKEN 已配置
- NEW_API_ADMIN_USER 已配置
- NEW_API_SQLITE_PATH 已配置
- NEW_API_WEBHOOK_SECRET 已配置
- 当前只使用系统令牌 token 认证
- NEW_API_ADMIN_COOKIE 方法已弃用，不再保留
- NEW_API_DB_URL 当前部署不使用，不再保留
- 所以 AI Key 创建所依赖的 new-api 管理侧基础配置目前是有值的

GSalary 上游相关：

- GSALARY_API_URL 已配置为 https://api.gsalary.com
- GSALARY_APP_ID 目前为空
- GSALARY_PRIVATE_KEY 目前为空
- GSALARY_DEFAULT_CARD_HOLDER_ID 目前为空
- GSALARY_MOCK=true

这表示：

- 当前开卡、卡片相关流程走的是 mock 模式
- 现在能测的是站内流程，不是真实 GSalary 上游联调
- 如果要测真实开卡，必须先补齐上面 3 个 GSalary 真值，并把 GSALARY_MOCK 改成 false

公网域名相关：

- NEXT_PUBLIC_APP_URL 目前还是 http://23.106.142.166:3000
- AI_API_BASE_URL 目前还是 http://23.106.142.166:3001

这表示：

- 当前系统内部能跑
- 但面向正式用户时，这两个值后面应该改成正式域名
- 建议后续改成：
- NEXT_PUBLIC_APP_URL=https://cardvela.com
- AI_API_BASE_URL=https://api.cardvela.com

## 联调前提

- 当前开卡上游还是 mock：GSALARY_MOCK=true
- 当前 GSalary 真实配置仍为空：GSALARY_APP_ID / GSALARY_PRIVATE_KEY / GSALARY_DEFAULT_CARD_HOLDER_ID 未填
- 所以“开卡成功”目前只能证明站内流程、数据库写入、页面联动正常
- 还不能证明真实 GSalary 上游已经打通
- AI 模块依赖 new-api，new-api 当前已可访问
- 充值不是自动到账，而是用户提交凭证后由管理员审核入账

## 已完成结果

- /etc/letsencrypt/live/cardvela.com/ 下已存在 fullchain.pem 和 privkey.pem
- nginx -t 已成功
- https://cardvela.com 返回 HTTP/2 200
- https://www.cardvela.com 返回 HTTP/2 200
- http://api.cardvela.com 返回 HTTP/1.1 200

## 当前生效配置

当前结论：

- 主站 cardvela.com 和 www.cardvela.com 已启用 HTTPS
- api.cardvela.com 暂时继续走 HTTP
- 这是当前正确状态，不需要继续折腾主站证书

## 接下来只做这几步

第 0 步：先去 GSalary 商户后台切白名单

要改的就是你截图里的 IP 地址白名单。

现在应该保留 / 增加：

- 23.106.142.166

现在应该删除旧机器 IP：

- 13.229.100.153

如果 46.137.237.230 和 112.96.173.45 不是 GSalary 额外确认过要保留的固定出口，也建议一并删除，避免继续放行非当前服务器来源。

Webhook URL 继续保持：

- https://cardvela.com/api/webhook/gsalary

这一项和代码里的回调路由一致，不需要改路径。

改完白名单后再测真实上游；否则开卡、查卡、交易同步这类请求很可能直接被 GSalary 拒掉。

第 0.1 步：先把服务器上的 RESEND_API_KEY 改成你找到的旧 key

在服务器执行：

```bash
sed -i 's|^RESEND_API_KEY=.*|RESEND_API_KEY=re_WTyyFZqr_Dvr2WTqpcHWVbhJA7C412Wvq|' /opt/cardvela/.env
grep '^RESEND_API_KEY=' /opt/cardvela/.env
```

如果 grep 输出的就是这串 key，说明服务器环境变量文件已经改好了。

第 0.2 步：把已确认可用的旧 GSalary 真值一起写回服务器 .env

在服务器执行：

```bash
cat > /opt/cardvela/.env <<'EOF'
NODE_ENV=production
DATABASE_URL=postgresql://cardvela:CardVela2026Secure@127.0.0.1:5432/cardvela
JWT_SECRET=a01fd7c2a263433ed8b062b5a940818d9af4979d1e049f3f4e09ba35cd34c38f
CRON_SECRET=f7f097cfa9e54db79c9f09582b04c9aafb3b6cd57c01b305899f1d696fb8db8d
NEXT_PUBLIC_APP_URL=http://23.106.142.166:3000

NEW_API_BASE_URL=http://127.0.0.1:3001
NEW_API_ADMIN_TOKEN=ubDTYq6HeyG8hQRuAFSPVnVWiCL0xg==
NEW_API_ADMIN_USER=1
NEW_API_SQLITE_PATH=/opt/new-api/data/one-api.db
NEW_API_WEBHOOK_SECRET=181560e0fe33aa7041fb52296b418138fd6abf0c45a595e56261594000e8a98b

AI_API_BASE_URL=http://23.106.142.166:3001

RESEND_API_KEY=re_WTyyFZqr_Dvr2WTqpcHWVbhJA7C412Wvq
GSALARY_API_URL=https://api.gsalary.com
GSALARY_APP_ID=8a3efb7e-67fa-41f2-b266-6f8d4f7c50d8
GSALARY_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIEogIBAAKCAQEAml1sByYY1PAeOPXlBqooM6pywhPQkHZ9VGd+kBXN1D6wDx7P\n2WyDFarz2k0PgwRc9E6gRRCz7ArnvLvrZXdRWK+GMHHT3qVBgITDVCKHnFo/QUet\n6u26oTJJSSQ0LHnIqrOK3TmFc5d6z9yJfQRXa6x7Qr7XYpaUReyg0Q8b1blE278f\nUAgtaDx9jsu2p7+Ac7ANA/goPyc0Ks3GjvUvJWkPCCUic5zrE0uHN36CGIKOyjk4\nRf7vQt4Kyx08/MZ9wa9dwfnk3gh7KahQZh/9TkUSgMFgxGrRhU21ZWFX/hImkQrG\nFakjBwyXTJSQVrR+o/4AkJhabFl1B0g5A8tvEwIDAQABAoIBABXVT+HE+C8qFUQ+\nN1oVeCEyow+jSNUeBUUKbGLJyraR9Un2NDTO/c1zRBFk4+RGmjUt58pM/f3NXxCZ\nTcaotTdDgEna17o+ioC4hn4gcijhtN+xWT6IyGRjXe078ys1QHYwddwrdh4u1z6O\nNV4a3piKqVZ78q/tl2Q6f1aCeg/k75IbryDGJEmdnvM8VrELovgi6GDTjYZdqeuh\nVV559KDsPR+y4kQdzLRKGi6rV/4furuFyVdbepFpBcMzjFRcD7alexcRSBTZ0/Zs\nAVUNEchy3rLmqxV+QFumOe7K+tdsKXdljDj1GLN00PjxyxcOqYPO7JXXE4E+CN4j\nCYbjECECgYEA2GHHC0MTF/cgzrr+fFQi+FUefhwg+Sm17iyVEi+jLmS4ll+Kz81U\n7dC+axj06t6IEbbCCrPTPEBsKp22/oJUFmnIJwJpTSyp4MdUENWmRW64dYw9lPE0\nzlLf06E9HFtMG/cOo/F+RWfhrm8IYFtgXNBJ/qvRwaLAIhb5BYxzQ2ECgYEAtqDK\nywDsKV/gm3w7iLHAEzGA9bD6+vG6V17AVXvow4OsF7kaom+1EcNyfMXbarG4vEIA\nG+7qQwKRDRA2hS55ap/FsYxIYfIUafa7fTgBcuXst8AZvt41EFTy3xm+hyiQ9rce\n9Ke6arfGN+Y9YUv+BNfgBMzMorGAaPV5+dguuvMCgYAosksjXRwsN7id6SGP9KsX\nFbtEcLnq4uNqxkvLPdZtFVh6P8H1z2KXz9jgf7MgsXXaDwtzw9qIzH0LjtoqCA0U\nohSY8aUodKwGsLao6+X3zRk4UoYKi0spOwEJ5pt9x9YKtG62eucK2rzhd9SVetom\n2q3wDhTHXHrSbourdX0AQQKBgCDS53/zC38oN1Na0cxwvif09sux4nol5ir74a+7\nlItHaC/fWhUl5LJroXEhkp0rkhtr9V8P4tTmajGh31qyjqoGS17s6rmH6/lbmjkY\nTtJa1t/zy+zNPVZRHlHQ67iZJuzg3tR0LQIvQ5YacJ/DK8WtExtpv8HiC0VSEXlB\nTKzXAoGASVlmlavrNoFeN2VpaX1zTNfS5c6gu4t7vmACkKf9wmAB/1zK1OauBDaI\nvgb1Yo+HmU8tceFQsSVidVMAfDv2VabuhwYDOkrY7qJACncuMCxoHIQAa7IACce2\nMSO7yoj/lJLsJwX/6L2RJq+RKGU8cAsb8AyL6bUDV5QzAi1kVpE=\n-----END RSA PRIVATE KEY-----"
GSALARY_DEFAULT_CARD_HOLDER_ID=2026012413391915084700160861
GSALARY_MOCK=false
EOF
```

这一步会直接用“服务器当前有效值 + 本地旧文件里确认可复用值”重建 /opt/cardvela/.env。

如果你粘贴后怀疑有串行或丢行，不要继续重启，先立即校验这 6 行：

```bash
grep '^RESEND_API_KEY=' /opt/cardvela/.env
grep '^GSALARY_APP_ID=' /opt/cardvela/.env
grep '^GSALARY_DEFAULT_CARD_HOLDER_ID=' /opt/cardvela/.env
grep '^GSALARY_MOCK=' /opt/cardvela/.env
grep '^NEW_API_ADMIN_TOKEN=' /opt/cardvela/.env
grep '^AI_API_BASE_URL=' /opt/cardvela/.env
```

如果任何一行缺失，或者出现粘连现象，例如：

- EOFLARY_MOCK=falseRD_HOLDER_ID=...

说明这次写入失败，必须重新完整覆盖一次 /opt/cardvela/.env，不能继续直接重启。

第 0.3 步：重启主站进程，让新环境变量生效

```bash
pm2 restart cardvela --update-env
pm2 logs cardvela --nostream --lines 50
```

正常情况：

- pm2 重启成功
- 日志里没有明显启动报错

第 0.4 步：重新测试注册验证码发送

- 用一个新的未注册邮箱在注册页点“发送验证码”
- 如果成功，验证码应该直接发到邮箱
- 如果失败，再立刻查看 pm2 日志

查看日志命令：

```bash
pm2 logs cardvela --nostream --lines 100
```

重点看这些信息：

- [Email] RESEND_API_KEY 存在: true
- [Resend] 开始发送邮件至:
- [Resend] 发送成功

如果还是失败，把日志输出发我，我继续判断是 key 失效、域名未验证，还是 Resend 账号侧问题。

第 1 步：先准备一个普通测试用户

- 不要用管理员账号测完整用户流程
- 新注册一个普通用户，用它测充值、开卡、AI 钱包、AI Key
- 这样最接近真实用户路径

第 2 步：测试充值流程

用户侧要走的路径：

- 登录普通测试用户
- 进入 dashboard
- 发起一笔充值订单
- 上传付款截图或凭证

代码现状：

- 充值订单创建接口：/api/user/recharge
- 用户提交凭证后，订单状态会变成 processing
- 管理员审核接口：/api/admin/orders
- 只有管理员确认后，用户主余额 balance 才会增加

成功标准：

- 用户能成功创建充值订单
- 管理员后台能看到该订单
- 管理员确认后，用户 balance 增加

第 3 步：测试开卡流程

用户侧要走的路径：

- 进入 dashboard 的开卡页签
- 选择一个可见的卡类型
- 勾选开卡须知
- 点击确认开卡

代码现状：

- 开卡接口：/api/user/cards
- 当前前端固定传 initialAmount=0
- 只要用户 balance >= openFee 就能走开卡
- 当前是 GSalary mock 模式，所以这一步验证的是站内流程，不是真实上游开卡

成功标准：

- 页面提示开卡成功
- 用户卡列表新增一张卡
- 用户主余额按 openFee 扣减
- 数据库里 userCard 和 transaction 有新增记录

第 4 步：测试卡详情查看限制

代码现状：

- 查看卡密前会先发验证码接口：/api/user/cards/verify
- 但必须先给该卡完成至少一笔 card_recharge，才允许看卡详情
- 没有首充会返回 NEED_FIRST_RECHARGE

所以当前联调先验证这条限制是否生效：

- 打开新卡详情
- 点击发送验证码
- 预期先被拦住，提示先充值至少 $5

这一步如果提示正确，说明“开卡后详情保护逻辑”正常。

第 5 步：测试 AI 钱包转账

用户侧要走的路径：

- 进入 dashboard 的 AI 页签
- 从主余额转入 AI 钱包

代码现状：

- 接口：/api/user/ai-service/transfer
- 最低转账金额 $1
- 只有主余额足够时才能转入

成功标准：

- 转账成功
- 用户 balance 下降
- 用户 aiBalance 上升

第 6 步：测试 AI 套餐和 Key 创建

先决条件：

- 管理员后台必须已经有至少一个启用状态的 AI Provider
- 管理员后台必须已经有至少一个启用状态的 AI Tier
- 用户 AI 钱包余额必须大于 0

代码现状：

- 套餐列表接口：/api/user/ai-service/tiers
- 创建 Key 接口：/api/user/ai-service/keys
- 创建时会去 new-api 创建 token
- 如果 new-api 管理令牌、数据库读取、channelGroup 有问题，会在这一步暴露

成功标准：

- AI 页签能看到套餐
- 用户能成功创建一个 Key
- 页面返回 API Key 和配置说明
- 管理员后台能看到新增 AI Key

第 7 步：当前最重要的判断结论

- 开卡流程现在只能测“站内闭环 + mock 上游”
- 如果你要测真实 GSalary 上游，必须先补齐真实 GSalary 配置并关闭 GSALARY_MOCK
- AI 模块现在可以开始做真实联调，因为它依赖的是 new-api，而不是 GSalary

第 8 步：你接下来实际执行的顺序

1. 新注册一个普通测试用户
2. 用管理员审核一笔充值，让这个测试用户拿到余额
3. 用测试用户走一次开卡
4. 验证卡详情被“首充限制”拦住
5. 用测试用户从主余额转一部分到 AI 钱包
6. 在 AI 页签尝试创建一个 Key

第 9 步：把下面这些结果发给我

- 普通测试用户邮箱
- 充值订单是否创建成功
- 管理员审核后用户余额是否增加
- 开卡是否成功
- 查看卡详情时是否提示先首充
- AI 钱包转账是否成功
- AI Key 是否创建成功

## 下一阶段

1. 跑通普通用户充值到开卡闭环。
2. 跑通 AI 钱包到 AI Key 创建闭环。
3. 后续再补真实 GSalary 上游联调。

# Spanler · 跨境科技官网

全新项目：AI SDR 出海获客 + 海外华人生活服务。Cloudflare Pages 静态前端、Pages Functions 网关、D1 内容/线索库、R2 媒体/私有聊天日志、Sveltia Git CMS、Groq/Llama、NocoDB 和 Resend 集成。

## 当前交付状态

- 7 核心页面 × 中/英/西三语，另有隐私/Cookie 页面，共 27 个预渲染路由。
- `/admin/`：独立数据库内容后台；编辑文案、上传图片/音视频/PDF、插入素材、保存发布、管理线索。
- `/admin/git/`：自托管 Sveltia CMS；GitHub OAuth 配置后可编辑 Git 默认文案。D1 发布内容优先于 Git 默认内容。
- 本地集成和浏览器验证通过；线上 Cloudflare、真实 Turnstile、Groq、NocoDB、邮件尚未联调。不能把本地测试通过视为正式上线。
- 原电话商城代码已移除。原代码归档在当前环境 `/workspace/spanler-backups/legacy-source-20261104.tar.gz`，旧本地测试数据库也已归档后清除，新版使用独立数据库；线上数据库尚未操作。
- 方案中“78页”尚未确认，当前按 7 个核心栏目实现。尚未提供最终系统提示词，因此 `shared/content.js` 包含可审阅的初稿。

## 本地运行

需要 Node.js 22.12+（当前验证 Node 24）。当前任务已隔离，使用现有 checkout；除非用户要求，不创建 Git worktree。

```sh
npm ci
cp .env.example .dev.vars
# 只用于本地：设置 LOCAL_DEV=true、SITE_URL=http://localhost:3001
# ADMIN_PASSWORD >=16字符，ADMIN_SESSION_SECRET >=32字符；用安全随机值，勿提交。
npm run build
npx wrangler d1 migrations apply DB --local --persist-to /workspace/spanler-v2-state
npx wrangler pages dev dist --port 3001 --persist-to /workspace/spanler-v2-state
```

当前环境已生成权限为 0600 的 `.dev.vars`，不要覆盖或打印它。迁移可重复执行，不会重新灌入或清空已有数据。修改前端后重新构建；Functions 由 Wrangler 监听。纯前端 `npm run dev` 不执行 API。

```sh
npm test                 # 9项安全/AI模拟测试
npm run test:smoke       # 需要上面的本地服务，写入明确标识的测试记录
npm run test:browser     # 使用Chromium验证页面、后台发布与媒体展示
```

`scripts/smoke.mjs` 仅对本地测试数据库执行，会留下测试线索；重复运行计入小时限流。勿对生产执行。测试用模拟 AI 不产生真实 token 花费。

## 文档

- [部署与账号接入](docs/DEPLOYMENT.md)
- [后台操作手册](docs/CMS.md)
- [Groq、费用与数据保留](docs/AI.md)
- [NocoDB、表单与邮件](docs/CRM.md)
- [验收记录与待办](docs/ACCEPTANCE.md)

## 重要边界

NocoDB 开源软件免费，但自建需要常驻服务器；Cloudflare 免费额度和第三方价格受供应商政策约束，不能保证永久零月租。未配置的外部服务明确显示不可用或待同步，不伪造成功。隐私说明是待运营者和法律顾问审核的初稿，非合规保证。

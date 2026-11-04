# 部署与账号接入

## 1. 发布前需要的信息

- Cloudflare 账号及 `spanler.com` 域名管理权限。
- GitHub 仓库 `zhangzhiyong2026-cpu/spanler.com` 的写入/Pages 连接权限。
- 用户已澄清只有Cloudflare网站托管，没有独立服务器。当前先部署官网及D1内容/线索后台，NocoDB保留为后续可选集成，不创建crm域名。
- 通知收件邮箱已确认：`zzy4628@gmail.com`；经过验证的发件域名/地址仍待配置。
- 品牌：Spanler；主要服务地区：洛杉矶；联系及隐私邮箱：`zzy4628@gmail.com`。注册主体与专业资质仍需确认，不把品牌名冒充注册公司信息。
- Groq API key。所有密钥在供应商或 Cloudflare 设置中输入，不能发在聊天或写入 Git。

部署代理需要在安全的环境设置中填写 CLOUDFLARE_API_TOKEN，令牌限定所需账号并包含 Pages、D1、R2 管理权限；只有确需修改域名记录时才增加相应域名的DNS编辑权限。不要把代理注入的占位值复制成 Pages Secret，生产模型/CRM/邮件密钥应通过Cloudflare控制台单独安全配置。

## 2. Cloudflare 资源

不要复用旧电话商城数据库。先导出需要保留的旧数据，新建资源：

```sh
npx wrangler login
npx wrangler d1 create spanler-content
npx wrangler r2 bucket create spanler-media
npx wrangler r2 bucket create spanler-chat-logs
```

将创建结果中的真实 `database_id` 填到 `wrangler.jsonc`。当前已配置正式新库 `spanler-content`，实际UUID见 `wrangler.jsonc`，原商城库保留。

```sh
npx wrangler d1 migrations apply DB --remote
npm ci
npm run build
npx wrangler pages deploy dist --project-name spanler-com --branch main
```

也可使用 Pages Git 集成：构建 `npm run build`，输出 `dist`，Node 24，配置与 `wrangler.jsonc` 相同的绑定：`DB`、`MEDIA`、`CHAT_LOGS`。初次正式发布前确认数据库迁移已执行。不要在每次部署时重置数据库。

`npm run deploy` 默认按当前 Git 分支发布；正式生产应明确指定 `--branch main`，不要把预览部署误认为生产部署。

## 3. 环境变量和密钥

Pages 生产与预览环境分别配置。生产不要配置 `LOCAL_DEV=true`。本地验证绕过只在显式 LOCAL_DEV 且 SITE_URL 是 localhost/127.0.0.1 时生效。

| 名称 | 类型 | 用途 |
|---|---|---|
| SITE_URL | 普通变量 | https://spanler.com；请求来源与 OAuth 回调校验 |
| ADMIN_PASSWORD | Secret | 至少16字符的随机管理员密码 |
| ADMIN_SESSION_SECRET | Secret | 至少32字符随机签名密钥；轮换会使旧会话失效 |
| TURNSTILE_SITE_KEY | 普通变量 | 网站及管理员登录的人机验证组件 |
| TURNSTILE_SECRET_KEY | Secret | 服务端验证；生产缺失时拒绝提交/登录 |
| GROQ_API_KEY | Secret | Groq API 访问 |
| AI_ENABLED | 普通变量 | 初始 false，真实测试后设为 true |
| AI_DAILY_LIMIT / AI_MONTHLY_LIMIT | 普通变量 | 全站请求硬上限，默认100/1000 |
| AI_MAX_OUTPUT_TOKENS | 普通变量 | 默认400，代码最高600 |
| NOCODB_URL | 普通变量 | 实际接收线索的 HTTPS webhook 或 records endpoint |
| NOCODB_TOKEN | Secret | NocoDB token/接收端鉴权 token |
| NOCODB_MODE | 普通变量 | webhook 或 records |
| RESEND_API_KEY | Secret | 邮件通知 |
| NOTIFY_EMAIL / MAIL_FROM | 普通变量 | 收件邮箱 / 已验证发件地址 |
| GITHUB_OAUTH_CLIENT_ID | 普通变量 | Sveltia GitHub OAuth app |
| GITHUB_OAUTH_CLIENT_SECRET | Secret | OAuth app secret |
| GA4_ID | 普通变量 | 可选 G- 开头的衡量ID |

Secret 可用 `npx wrangler pages secret put NAME --project-name spanler-com` 或 Pages 控制台安全设置。绝不把 `.dev.vars` 上传到 Git。

## 4. Turnstile / DNS / Git CMS

在 Cloudflare Turnstile 新建 Widget，允许 `spanler.com` 与实际预览域名（需要对应 SITE_URL）。不要用测试密钥替代生产验收。

Pages Custom domains 绑定 `spanler.com`，按平台要求修改 DNS 并确认 HTTPS。当前重建不需要 `*.buy` 通配符；不要擅自删除已有 DNS 或其他业务服务。

GitHub 创建 OAuth App：Homepage `https://spanler.com`，callback `https://spanler.com/api/cms/callback`。OAuth 接口包含 state Cookie 校验、一次性 code 交换、限定 postMessage 接收域。GitHub token 的仓库访问权由 GitHub 强制检查；根据仓库私有性评估 `repo` 权限范围。可日常使用数据库后台避免 Git OAuth。

Sveltia 固定版本由 npm 安装，构建时复制到 `dist/vendor/sveltia`，没有第三方 CMS CDN 依赖。Git 文案在 `shared/pages.json`。Git 提交必须触发 Pages 构建；数据库后台不依赖 Git 构建即可更新浏览器展示。

## 5. 存储与隐私

MEDIA 可经 `/media/<uuid>/<filename>` 公开读取，用于官网素材；不要上传客户隐私资料。CHAT_LOGS 不开放公开访问；在 R2 控制台查看 JSON，并设30天自动过期生命周期。日志桶严禁开启公网访问。

正式上线需确认备份、数据库导出、数据删除请求处理、运营主体与隐私联系渠道。CCPA 文案和 Cookie 开关已提供初稿，不代表法律审核已完成。

## 6. SEO / GA4 / Search Console

构建生成三语 canonical、hreflang、OG 元数据、robots、sitemap；Search Console 验证域名后提交 `https://spanler.com/sitemap.xml`。GA4 在配置 GA4_ID 且访客明确同意后才加载；拒绝和 Global Privacy Control 均不加载。

数据库后台更新会立即影响浏览器 API 展示；预渲染 HTML/SEO 文案来自 Git 默认内容，需同步更新 Git 内容并重新构建，才能同步静态搜索索引。这个差异须运营者知悉；一期未提供数据库到 Git 自动回写。

## 7. 真实验收

用真实浏览器分别验收三语站点、登录、文件上传与播放/PDF、内容发布、Turnstile 成败、表单CRM新增记录、邮件送达、Groq回复和私有R2日志。检查外部服务失败时保留 pending/failed 状态，后台可重试。确认后再开启 AI 和正式域名。

## 当前实际部署目标

Cloudflare账号已用账户级API令牌验证；项目为已有 `spanler-com`，域名spanler.com已处于active。Pages、D1、R2权限可用；用户已补充Turnstile Edit，专用Managed组件已创建并绑定；下一步重新发布并验收。

新建内容库的生产迁移已执行，媒体桶复用spanler-media，新的私有日志桶为spanler-chat-logs。只先部署官网/后台，AI保持关闭、现有Groq绑定保留，不自动删除任何日志或旧数据库。后台凭据保存在云环境的私有交付文件中，不在Git中。人机验证配置完成前，生产表单和后台登录会拒绝请求，不能称为全部验收通过。

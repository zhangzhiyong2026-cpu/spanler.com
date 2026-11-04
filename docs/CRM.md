# 表单、NocoDB与邮件

## 持久化与同步流程

表单 → 必填/邮箱/同意/蜜罐校验 → IP限流 → Turnstile服务端验证 → D1持久保存 → 后台任务同步CRM和发邮件。

提交成功只代表D1已接收，不代表邮件或CRM已经送达。后台分别显示 pending、sent 或 failed；可手动重试。没有定时调度器，不保证自动无限重试。

业务类型仅允许 `ai_sdr` / `overseas_chinese_service`，推送标签 `type:ai_sdr` / `type:overseas_chinese_service`。保留来源页面、限定的5个UTM字段和UTC时间。

## NocoDB

用户后续澄清没有独立服务器，只有Cloudflare网站托管。当前先使用官网D1线索库；[NocoDB部署方案](../deployment/nocodb/README.md)保留为后续选项，尚未连接任何生产CRM。

NocoDB自建需要已有服务器或另行选定托管方案；它不能直接运行在Pages Functions。开源许可免费不代表服务器免费，托管免费层是否可用应在选型时核实。

可以使用以下两种方式：

- `NOCODB_MODE=records`：NOCODB_URL填实际版本的records API完整地址，例如管理员提供的 `/api/v2/tables/<tableId>/records`。NOCODB_TOKEN是有该表写权限的API token。不能只填首页地址。
- `NOCODB_MODE=webhook`：URL必须是能接收POST并写入线索表的HTTPS接收器（NocoDB版本支持的入站工作流或自建接收器）。NocoDB常见的“Webhook”是出站通知，不能把出站Webhook设置当成入站新增记录API。

代码发送 `xc-token` 和 Bearer 头，接收端应采用支持的一种鉴权方式；HTTPS验证保留，拒绝重定向。没有配置URL和token时不会发请求。

### 表结构

| 字段 | NocoDB类型 | 说明 |
|---|---|---|
| id | Single line text / 唯一 | D1线索UUID；作为外部唯一键去重 |
| name | Single line text | 姓名 |
| email | Email | 邮箱 |
| company | Single line text | 可空 |
| message | Long text | 需求 |
| type | Single line text | ai_sdr / overseas_chinese_service |
| tag | Single line text | type:... |
| language | Single line text | zh/en/es |
| source_page | Single line text | 来源路径 |
| utm | Long text或JSON | records模式以JSON字符串发送 |
| created_at | Date/time | UTC时间 |

当前固定NocoDB版本的本地验证确认：自动生成的 `Id` 主键与外部线索 `id` 文本字段不同，建表请求中的pk标记不会让该文本列自动唯一。需核实物理列名后添加PostgreSQL唯一索引，方法见部署目录文档。

请求有 `Idempotency-Key` 头，但接收端不一定支持。需在CRM对 `id` 设唯一约束或用接收器做upsert，避免网络超时后手动重试造成重复。当前没有跨系统事务或exactly-once保证。先用测试线索真实验证版本/字段匹配，再接生产。

## Resend邮件通知

通知收件地址已确认并设为 `zzy4628@gmail.com`。建立Resend账号、验证发件域名，再配置 RESEND_API_KEY、MAIL_FROM。Gmail是收件地址，不应直接作为未经Resend域名验证的发件地址。邮件使用纯文本并保留 lead UUID 作为幂等键，不渲染用户HTML。发件服务免费额度、域名验证和送达率由供应商决定。

测试：提交一条带唯一标识的咨询 → 管理后台出现 → NocoDB出现且标签正确 → 收件箱收到通知 → 状态分别为sent。模拟无效token时，应保留failed状态而不丢失D1记录，修正后重试。

## 导出与删除请求

目前后台可查看近期100条线索，数据删除/大批量导出由授权管理员通过D1工具执行。先确认请求人的身份和待删除UUID，避免在公开表单索要身份证。同步删除NocoDB及相关通知/AI日志。上线前需要确定运营责任人与响应流程。

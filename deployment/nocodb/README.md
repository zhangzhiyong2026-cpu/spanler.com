# Spanler NocoDB 自建部署

用户已有服务器，目标是在其上运行 NocoDB + PostgreSQL，避免另购托管CRM。当前尚未提供服务器地址、系统、接入方式或现有站点情况；这些文件是待安装方案，不代表服务器已部署。暂定域名 `crm.spanler.com`，尚未修改DNS。

## 连接服务器后先检查

确认Linux发行版/CPU架构/空闲内存磁盘、Docker/Compose版本、已有容器与80/443/8088端口、反向代理和防火墙。不要卸载现有软件、重启整台服务器或覆盖已有网站配置。建议至少预留2GB可用内存用于起步，实际按负载和验证结果调整。

本配置只暴露 `127.0.0.1:8088`，PostgreSQL不开放宿主端口。不指定container_name，使用独立Compose项目 `spanler-crm` 避免和其他项目冲突；若已有同名项目，先保留现有数据并另设项目名。

## 准备与启动

服务器需Docker Engine和Compose v2。安装方式要按实际系统确认后执行，不使用未经检查的一键脚本。复制本目录到独立位置（例如 `/opt/spanler-crm`），然后：

```sh
python3 prepare-env.py --url https://crm.spanler.com --port 8088
docker compose config --quiet
docker compose pull
docker compose up -d --wait --wait-timeout 300
curl --fail http://127.0.0.1:8088/api/v1/health
```

生成器不会覆盖现有`.env`，不会输出密码。文件模式0600；使用足够随机且可安全进入连接字符串的十六进制密码。镜像固定版本和多架构摘要，不使用latest；升级前重新验证官方发行版、摘要与兼容性，先备份。

## 初始化管理员与HTTPS

先保持外部反向代理入口关闭，通过现有安全SSH通道或服务器管理面板访问本机8088端口，创建第一个管理员。不要让公开访问者抢先注册管理员，也不要在代码中预设管理员密码。

如果服务器已有Caddy，将 `Caddyfile.example` 站点块合入现有配置，先验证再reload；若已有Nginx/宝塔/1Panel，则在现有系统中新增 `crm.spanler.com` HTTPS反代到127.0.0.1:8088，不另装一个抢占80/443的服务。证书必须有效且自动续期；不要关闭TLS验证。

DNS和域名接入需要真实Cloudflare授权。若使用访问控制网关，保留Worker服务器到NocoDB API的鉴权通道，避免把CRM API重定向为浏览器登录页。不开公开Base分享，使用最小权限API token，并在管理界面按实际版本限制注册/邀请权限。

## 建表与接入官网

参考 `../../docs/CRM.md` 建立Leads表；`leads-table.json` 提供已在当前固定版本验证的API建表字段。其余列包括name/email/company/message/type/tag/language/source_page/utm/created_at。

**去重需要真实数据库约束。** 本次验证发现NocoDB会自行创建自增 `Id` 主键，把名为 `id` 的新文本字段存为另一个物理字段（本次是 `id1`），即使建表请求标记pk也不会取代系统主键。仅在界面写“唯一”或发送Idempotency-Key不能去重。连接实际服务器后，先从表元数据确认schema、table_name及外部UUID字段的column_name，在PostgreSQL添加该字段的唯一索引，并做重复请求验收。例如：

```sql
-- 用实际元数据替换占位符；先检查并清理重复记录，不能盲目执行。
CREATE UNIQUE INDEX spanler_leads_external_id_unique
ON "<actual_schema>"."<actual_table>" ("<actual_external_uuid_column>");
```

本地已确认唯一索引会阻止重复UUID。若请求在CRM已写入后超时，随后重试可能遇到唯一冲突，需核实已有记录后由负责人处理同步状态；当前官网不保证跨系统exactly-once。若需要无人工恢复的upsert，可在后续接收器中实现。

在NocoDB实际版本的API说明中复制表格records端点，不猜测路径。当前官网默认 `NOCODB_MODE=records`，填写完整HTTPS地址和受限token到Cloudflare Pages；不要公开token或发到聊天。收件邮箱已设为 `zzy4628@gmail.com`，发件方仍需要验证域名和邮件服务密钥。

验收必须从网站提交一条唯一测试线索，确认D1落库、NocoDB新增且标签正确、邮件送达，并验证错误后可重试。首次安装需记录API版本和功能差异；配置语法通过不代表这些外部链路通过。

## 备份与恢复

```sh
bash backup.sh
```

备份包含PostgreSQL自定义格式dump和附件压缩包。附件备份期间暂停写入或安排维护窗口；这是两个先后生成的快照，不承诺跨存储事务一致性。`.env`中的JWT和数据库密钥需另存于安全的密码管理器，不能提交Git。

定期将备份安全复制到服务器之外，并测试在隔离的全新项目中恢复：先启动空的同版本PostgreSQL，用 `pg_restore -U nocodb -d nocodb --exit-on-error --no-owner` 导入dump，再恢复附件目录和原JWT密钥，最后启动匹配版本NocoDB验证记录和文件。原生产卷先保留，不能直接覆盖来“测试恢复”。

不要使用 `docker compose down -v` 清理生产，它会删除持久数据卷。本方案不替代服务器现有备份策略。实际定时任务与保留期限待服务器接入后设置。

## 本次云端验证范围

在独立Compose测试项目中，固定摘要镜像拉取、PostgreSQL与NocoDB健康检查、测试管理员初始化、真实API建表和线索增查、外部UUID数据库去重和备份脚本均已实际执行。测试使用example.test保留域名，没有真实客户数据或通知邮件。这个结果不代表用户服务器安装、HTTPS、机器API-token鉴权或官网到CRM的生产链路已验证。

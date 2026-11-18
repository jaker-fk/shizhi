# 从多用户自托管到公网服务：开发路线

当前版本已经不是单用户版本：它具备邮箱注册/登录、Argon2id 密码哈希、服务端会话和基于 `owner_id` 的多用户数据隔离。`web → api → MySQL` 三个服务由 Docker Compose 编排，目前只绑定 `127.0.0.1:8765`。

但「局域网可用」和「可以公开注册」之间还有一段距离。公开上线前，至少还要补齐 HTTPS、邮箱验证、密码找回、更严格的防滥用、备份恢复和运维监控。

---

## 1. 现在已经具备什么

| 能力 | 实现 |
| --- | --- |
| 账号注册/登录/退出 | `POST /api/auth/register`、`login`、`logout`，`GET /api/auth/me` |
| 密码存储 | Argon2id 哈希，数据库不保存明文 |
| 登录会话 | 随机 token；数据库只存 SHA-256 哈希；HttpOnly + SameSite=Lax Cookie |
| 多用户隔离 | `knowledge_points.owner_id`，所有查询、修改、删除、导入都按当前用户过滤 |
| 越权访问 | 访问他人知识点统一返回 404，不泄露记录是否存在 |
| 跨站写请求 | 校验同源 `Origin`；Cookie 使用 SameSite |
| 认证限流 | Nginx 按 IP 限制 `/api/auth/` 请求频率 |
| 旧数据迁移 | 第一个注册账号会接管旧版未归属数据 |
| 数据持久化 | MySQL 8.4 + Docker 卷 `shizhi_mysql_data` |

服务端代码中，用户身份只来自会话：

```text
Cookie → token_hash → sessions → user_id → owner_id 过滤
```

**不要**接受客户端传来的 `user_id` 或 `owner_id` 作为身份依据；当前实现也没有这样做。

---

## 2. 公网化还缺什么

| 能力 | 当前 | 公网要求 |
| --- | --- | --- |
| HTTPS | 本地 HTTP | 强制 HTTPS、HSTS、Secure Cookie |
| 邮箱真实性 | 注册不验证邮箱 | 邮箱验证链接 |
| 密码找回 | 未实现 | 一次性 reset token + 邮件 |
| 注册控制 | 开放注册 | 邀请码/验证码/审核，按需选择 |
| 滥用防护 | 基础 IP 限流 | 登录失败计数、验证码、配额、WAF |
| 账号生命周期 | 无注销 | 账号停用、数据导出、删除 |
| 管理能力 | 无后台 | 用户管理、封禁、审计 |
| 运维 | 健康检查/日志 | 监控、告警、备份恢复演练 |
| 数据库迁移 | 启动时 `create_all` + 简单迁移 | Alembic/迁移流水线 |
| 合规 | 无 | 隐私政策、用户协议、数据保留策略 |

---

## 3. 目标架构

```text
Internet
  │ 443 / HTTPS
  ▼
Caddy / Traefik / Cloudflare
  ├── 静态页面
  └── /api → FastAPI（可多副本）
                │
                ▼
          MySQL（只在内网）
                │
        Redis（可选：限流 / 会话黑名单 / 缓存）
```

原则：

1. 数据库绝不暴露公网；API 也不直接对公网暴露 8000。
2. 只开放 443（和必要的 80 跳转），关闭 8765/3306。
3. 用户身份只从服务端会话解析。
4. 所有数据查询必须带 `owner_id` 条件。
5. 备份必须能在 staging 环境成功恢复一次。

---

## 4. 上线前必须完成的工作

### 4.1 域名、TLS 与反向代理

- 域名解析到服务器；
- 用 Caddy 或 Traefik 自动申请 Let's Encrypt 证书；
- 只把 Web 入口暴露到公网，API/MySQL 继续留在 Docker 内部网络；
- 设置 `COOKIE_SECURE=true`，让会话 Cookie 只通过 HTTPS 发送；
- 开启 HSTS、强制 HTTPS；
- 如果使用 Cloudflare，配置源站证书，不要只依赖 CDN 防护；
- 如果外层还有一层反向代理，请配置 Nginx `real_ip_header X-Forwarded-For` 和可信代理地址，否则限流会把所有用户看成同一个 IP。

当前 Compose 的端口是：

```yaml
ports:
  - "127.0.0.1:8765:80"
```

公网部署时不要让这个端口直接对 `0.0.0.0` 开放。推荐在宿主机增加 Caddy/Traefik，由它反代到 `127.0.0.1:8765`，只公开 443。

### 4.2 邮箱验证与密码找回

新增表：

```sql
CREATE TABLE email_verification_tokens (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE password_reset_tokens (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

流程：

- 注册后发送一次性验证链接，验证前限制写操作；
- 忘记密码只发送 reset 链接，不发送新密码；
- token 只存哈希，设置短有效期（如 30 分钟），使用后立即失效；
- 修改密码后撤销该用户全部其他会话；
- 提供账号注销与数据导出。

### 4.3 注册控制与反滥用

- 用 `ALLOW_REGISTRATION=false` 关闭公开注册；空库时仍允许创建第一个账号；
- 使用邀请码或管理员创建账号；
- 开放注册时增加邮箱验证、验证码和频率限制；
- 登录失败按 IP + 邮箱双重限流；
- 限制单用户知识点数量、导入大小和请求频率；
- 监控异常注册和批量写入；
- 使用 Nginx `limit_req`、Cloudflare 或 WAF 作为第一层防护。

### 4.4 安全加固

- [ ] 修改 `.env` 中的默认数据库密码
- [ ] 设置 `COOKIE_SECURE=true`
- [ ] 强制 HTTPS 和 HSTS
- [ ] 会话 Cookie 保持 HttpOnly + SameSite=Lax
- [ ] 登录后轮换 session token
- [ ] 修改密码后撤销所有其他会话
- [ ] 限制 `Origin` 与 CORS 允许来源
- [ ] 对认证、导入接口做严格限流
- [ ] 错误信息不泄露数据库细节
- [ ] 日志不记录密码、Cookie、完整正文
- [ ] 数据库账户最小权限，应用不使用 root
- [ ] 依赖定期更新与镜像扫描
- [ ] 加入审计日志（登录、失败、删除、导出）

### 4.5 数据、备份与迁移

- 上线前把启动时建表迁移为 **Alembic** 迁移；
- 每日全量备份 + binlog；至少保留 7–30 天；
- 在 staging 定期执行恢复演练；
- 数据库只允许 API 网络访问；
- 监控连接数、慢查询、磁盘使用率；
- 应用日志集中收集，设置错误告警；
- 对备份文件加密并限制访问。

### 4.6 合规与运营

- 隐私政策、用户协议；
- 数据导出、账号注销、删除期限；
- 内容举报、封禁与申诉；
- 如果面向未成年人或特定行业，补充相应合规要求；
- 明确服务可用性、备份和免责声明。

---

## 5. 推荐的上线顺序

1. 在 staging 完成 HTTPS、`COOKIE_SECURE=true` 和邮箱验证；
2. 用邀请码邀请 3–5 个真实用户测试；
3. 完成至少一次 MySQL 备份恢复演练；
4. 加监控、告警和审计日志；
5. 再考虑开放注册；
6. 最后再做服务端分页、Redis、只读副本等性能优化。

---

## 6. 规模化阶段

- 列表改为服务端分页；
- 中文全文检索可用 MySQL `FULLTEXT` + ngram，或 Meilisearch；
- 增加 `(owner_id, updated_at)` 复合索引（当前已建）；
- API 多副本，使用 Redis 存会话黑名单/限流；
- 托管 MySQL 或主从架构；
- 图片/附件使用对象存储；
- 引入后台任务处理邮件、导出、清理过期 token；
- CI/CD + 数据库迁移流水线。

---

## 7. 不要做的事

- 不要把 `127.0.0.1:8765` 直接改成 `0.0.0.0:8765` 上线；
- 不要只在前端隐藏别人的数据，后端必须过滤 `owner_id`；
- 不要把 MySQL 3306 暴露到公网；
- 不要把 token、密码放在 `localStorage`；
- 不要使用示例密码、默认 root 密码上线；
- 不要在没验证恢复的情况下认为备份可用；
- 不要在没有邮箱验证和密码找回的情况下直接开放公众注册。

当前代码已经是一个可用的多用户自托管起点。真正做到公网服务，剩下的是**账号生命周期、传输安全、反滥用和运维体系**，而不是重写业务代码。

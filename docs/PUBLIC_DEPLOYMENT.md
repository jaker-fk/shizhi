# 从单用户知识库到公网服务：开发路线

当前版本是**单用户、无登录**的知识库：`web → api → MySQL`，只有本机 `127.0.0.1:8765` 可以访问。它可以安全地作为个人服务运行，但**不能直接把端口开放到公网**——任何能访问页面的人都可以读取、修改和删除全部知识点。

下面按「先能安全上线，再逐步扩展」的顺序给出路线。

---

## 1. 当前架构与差距

```text
浏览器
  │ 127.0.0.1:8765
  ▼
Nginx（web）
  │ /api
  ▼
FastAPI（api）
  │ 3306
  ▼
MySQL 8.4（mysql，Docker 卷）
```

现有优势：

- 数据库已有独立容器和持久化卷；
- API 与数据库都没有暴露宿主机端口；
- 请求有长度、标题、标签等基础校验；
- 数据可以通过 JSON 和 SQL 备份。

公网化缺少的能力：

| 能力 | 现状 | 公网要求 |
| --- | --- | --- |
| 身份认证 | 无 | 注册/登录、密码哈希、会话 |
| 数据隔离 | 所有数据共享 | 每条记录归属某个用户 |
| 权限 | 全部可读写 | 只能操作自己的数据 |
| HTTPS | 无 | 强制 HTTPS |
| 滥用防护 | 无 | 限流、配额、验证码 |
| 运维 | 日志/健康检查 | 监控、告警、备份恢复演练 |
| 合规 | 无 | 隐私政策、账号注销、数据删除 |

---

## 2. 目标架构

```text
Internet
  │ 443
  ▼
Caddy / Traefik / Nginx
  ├── 静态页面
  └── /api → FastAPI（可多副本）
                │
                ▼
          MySQL（只在内网）
                │
        Redis（可选：会话 / 限流 / 缓存）
```

关键原则：

1. **数据库绝不暴露公网**，只允许 API 所在网络访问。
2. **API 不信任客户端传来的 `user_id`**，用户身份只能从服务端会话解析。
3. **所有查询都带 `owner_id` 条件**，不能只在页面上隐藏别人的数据。
4. **TLS 在入口层终止**，应用只监听内网 HTTP。
5. **备份和恢复都要演练**，只备份不恢复等于没有备份。

---

## 3. 第一阶段：公网 MVP

目标：用户可以注册、登录，只看到自己的知识点；站点通过 HTTPS 访问。

### 3.1 域名与 HTTPS

- 准备域名，解析到服务器；
- 用 Caddy 或 Traefik 自动申请 Let's Encrypt 证书；
- 只开放 80/443，关闭 8000/3306/8765 的公网访问；
- 开启 HSTS、强制 HTTPS；
- 给登录、注册、导入接口加限流。

如果不想自己维护证书，可以用 Cloudflare 代理 + 源站证书，但不要只依赖 CDN 的防护。

### 3.2 用户与会话表

建议新增：

```sql
CREATE TABLE users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(80) NOT NULL DEFAULT '',
  status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE sessions (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL,
  last_seen_at DATETIME NOT NULL,
  ip VARCHAR(64) NOT NULL DEFAULT '',
  user_agent VARCHAR(255) NOT NULL DEFAULT '',
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX ix_sessions_user (user_id),
  INDEX ix_sessions_expires (expires_at)
);
```

要点：

- 密码使用 **Argon2id**（如 `argon2-cffi`）或 bcrypt，绝对不要明文或可逆加密。
- 会话来使用**随机 256 位 token**，数据库只存 `token_hash`；浏览器存 **HttpOnly + Secure + SameSite=Lax** Cookie。
- 不要用 `localStorage` 存登录 token；XSS 可以直接读走。
- 登录成功后轮换 session id，防止会话固定。
- 支持退出登录、查看/撤销其他设备会话。
- 密码重置使用一次性、短时效 token；不要通过邮件明文发送新密码。
- 注册建议先做邀请码或邮箱验证，避免被批量注册。

### 3.3 知识点归属

给现有表加归属字段：

```sql
ALTER TABLE knowledge_points
  ADD COLUMN owner_id CHAR(36) NULL AFTER id,
  ADD INDEX ix_knowledge_owner_updated (owner_id, updated_at);

-- 为现有数据创建默认用户后，再执行：
UPDATE knowledge_points SET owner_id = '<默认用户ID>' WHERE owner_id IS NULL;

ALTER TABLE knowledge_points
  MODIFY owner_id CHAR(36) NOT NULL,
  ADD CONSTRAINT fk_knowledge_owner
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;
```

然后修改 API：

- `GET /api/knowledge` 只查当前会话用户；
- `POST` 写入时由服务端设置 `owner_id`；
- `PUT` / `DELETE` / `PATCH` 先按 `id + owner_id` 查记录，查不到返回 404；
- 不要接受客户端传入的 `owner_id`；
- 加测试：用户 A 不能读取、修改、删除用户 B 的记录。

### 3.4 认证接口

建议新增：

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/password-reset/request
POST /api/auth/password-reset/confirm
```

前端只依赖 `GET /api/auth/me` 判断登录状态，未登录时显示登录页。

### 3.5 安全清单

- [ ] 强制 HTTPS / HSTS
- [ ] 密码 Argon2id 或 bcrypt
- [ ] HttpOnly Secure Cookie；不把 token 放 localStorage
- [ ] 所有写接口校验当前用户归属
- [ ] CSRF 防护（SameSite + CSRF token 或双重 Cookie）
- [ ] 登录/注册/导入限流
- [ ] 请求体大小限制（Nginx + API 双重）
- [ ] 错误信息不泄露 SQL、堆栈、密码
- [ ] 日志不记录密码、Cookie、完整正文
- [ ] 管理接口使用独立角色并二次校验
- [ ] 数据库账号最小权限，禁止 root 连接应用
- [ ] 定期依赖升级与镜像扫描
- [ ] 备份加密并定期恢复演练
- [ ] 隐私政策、用户协议、账号注销与数据删除

### 3.6 部署与运维

- 用 `.env` 或 Docker secrets/云密钥管理服务保存密码，禁止提交真实 `.env`；
- 使用 Alembic 管理数据库结构变更，不再依赖启动时 `create_all`；
- 固定镜像版本，CI 构建并扫描；
- 添加 `/api/health` 监控、错误告警、磁盘和连接数告警；
- 备份：每天全量 + 定期 binlog，至少保留 7–30 天，并验证恢复；
- 发布前在 staging 环境验证登录、权限、导入、恢复。

### 3.7 参考工期

一个人开发、没有现成账号体系的情况下：

- 域名 + HTTPS + 基本部署：0.5–1 天；
- 用户注册/登录/会话：2–4 天；
- `owner_id` 数据迁移 + 全接口隔离：1–2 天；
- 限流、安全头、日志、备份、测试：2–3 天；
- 隐私/条款、注销、找回密码：1–2 天。

**大约 1–2 周可以做出可邀请小范围使用的 MVP**，而不是直接公开注册。

---

## 4. 第二阶段：公开注册与规模化

当用户量、数据量上来后，再处理这些问题：

### 数据与搜索

- 列表改为服务端分页，不要一次返回全部数据；
- 搜索改为服务端执行；中文可用 MySQL `FULLTEXT` + `ngram`，数据量很大时用 Meilisearch/OpenSearch；
- 增加 `(owner_id, updated_at)` 等复合索引；
- 导入限制条数和总大小，必要时改为后台任务。

### 性能

- API 水平扩容，放在反向代理后面；
- MySQL 使用托管服务或主从/只读副本；
- Redis 缓存会话、限流计数和热门查询；
- 附件/图片使用对象存储，不塞进 MySQL；
- 静态资源加 hash 文件名和长缓存。

### 运营与内容安全

- 邮箱验证、邀请码、注册验证码；
- 每用户配额（条数、导入大小、请求频率）；
- 举报、封禁、内容审核；
- 审计日志（谁在什么时候删除了什么）；
- 数据导出、账号注销、保留期策略。

---

## 5. 推荐的上线顺序

1. 保持当前单用户版本，继续本机使用；
2. 增加 `users`、`sessions`、`owner_id`，先做登录和权限测试；
3. 用测试域名部署 staging，只邀请自己和小范围用户；
4. 通过 HTTPS、限流、备份恢复和安全检查后，再开放注册；
5. 根据实际用量再拆搜索、缓存和后台任务，不要一开始就过度设计。

---

## 6. 不要做的事

- 不要把 `127.0.0.1:8765` 直接改成 `0.0.0.0:8765` 就上线；
- 不要只在前端隐藏“删除”按钮，后端必须校验权限；
- 不要把 MySQL 3306 暴露到公网；
- 不要把 JWT 或密码放在 `localStorage`；
- 不要使用示例密码、默认 root 密码上线；
- 不要在没有恢复演练的情况下认为备份可用。

当前代码是良好的单用户起点；真正公网化时，**认证与数据归属是第一优先级**，其余优化可以随后迭代。

<div align="center">

# 拾知 · Shizhi

**把知识收进自己的岛屿。**

一个自托管的知识点记录站：记录、分类、标签、搜索、收藏，一条 Docker 命令启动。

[![CI](https://github.com/jaker-fk/shizhi/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/jaker-fk/shizhi/actions/workflows/ci.yml)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white&style=flat-square)](https://www.docker.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white&style=flat-square)](https://fastapi.tiangolo.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.4-4479A1?logo=mysql&logoColor=white&style=flat-square)](https://www.mysql.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](#contributing)
[![GitHub stars](https://img.shields.io/github/stars/jaker-fk/shizhi?style=social)](https://github.com/jaker-fk/shizhi/stargazers)
[![GitHub last commit](https://img.shields.io/github/last-commit/jaker-fk/shizhi?style=flat-square)](https://github.com/jaker-fk/shizhi/commits/main)

<img src="preview.png" alt="拾知界面预览" width="100%">

</div>

> A self-hosted knowledge notes app built with Docker, FastAPI and MySQL.  
> Record ideas, code snippets, reading notes and small discoveries — then find them again.

## 为什么是「拾知」

市面上的笔记工具很多，但真正影响长期使用的往往只有两件事：**记的时候够不够轻**，以及**找的时候够不够快**。

拾知围绕这两件事设计：

- **数据是你自己的**：知识点写入你自己的 MySQL，Docker 数据卷持久化，不依赖第三方云服务。
- **启动只要一条命令**：Web、API、数据库全部由 Docker Compose 编排，宿主机不需要安装 Node/Python。
- **为长期积累设计**：分类、标签、收藏、搜索、排序、卡片/列表双视图，记录越多越能体现价值。
- **安静、克制、响应式**：没有信息流和推送；桌面、平板、手机都能顺畅使用。

## 功能

| 能力 | 说明 |
| --- | --- |
| ✍️ 记录与编辑 | 新建、编辑、删除知识点，删除后可在提示条中撤销 |
| 🗂 分类与标签 | 分类自由填写；标签用逗号分隔，侧栏自动汇总 |
| 🔎 搜索 | 搜索标题、正文、分类、标签和来源 |
| ⭐ 收藏 | 把值得反复回看的内容收进「我的收藏」 |
| ↕️ 排序与视图 | 最近更新 / 最近创建 / 标题排序；卡片 / 列表视图 |
| 💾 MySQL 持久化 | FastAPI 写入 MySQL 8.4，Docker 卷保存 |
| 📦 导入导出 | JSON 备份、合并导入；旧版 localStorage 数据自动迁移 |
| 📱 响应式 | 手机端编辑窗自动变为全屏表单 |
| ⌨️ 快捷键 | `/` 搜索、`N` 新建、`Ctrl/Cmd + Enter` 保存 |

## 快速开始

需要 Docker Desktop，或 Docker Engine + Compose v2。

```bash
git clone https://github.com/jaker-fk/shizhi.git
cd shizhi

# 可选但推荐：修改数据库密码
cp .env.example .env

docker compose up -d --build
```

打开 **<http://127.0.0.1:8765/>**。

Windows 用户也可以直接双击 `start.bat`，脚本会检查 Docker、构建并启动全部服务。

首次启动需要拉取 MySQL 镜像并初始化数据库。确认服务状态：

```bash
docker compose ps
```

三个服务都显示 `healthy` 后即可使用。停止服务：

```bash
docker compose down
```

> `docker compose down -v` 会删除 MySQL 数据卷。除非明确要清空数据，否则不要加 `-v`。

## 技术架构

```mermaid
flowchart LR
    U[浏览器] -->|http://127.0.0.1:8765| W[Nginx<br/>静态页面 + /api 反向代理]
    W -->|Docker 内部网络| A[FastAPI<br/>SQLAlchemy]
    A -->|3306 仅内部| D[(MySQL 8.4)]
    D --> V[(Docker Volume<br/>shizhi_mysql_data)]
```

- 只有 Web 映射到宿主机 `127.0.0.1:8765`，API 与 MySQL 不暴露端口。
- API 与前端同源，通过 Nginx 的 `/api` 反向代理访问，无需配置 CORS。
- 数据库结构由 SQLAlchemy 初始化，知识表为 `knowledge_points`。

## 数据存在哪里

| 项目 | 位置 |
| --- | --- |
| 数据库 | `shizhi` |
| 数据表 | `knowledge_points` |
| Docker 卷 | `shizhi_mysql_data` |
| 容器内路径 | `/var/lib/mysql` |

查看数据：

```bash
docker compose exec mysql sh -c \
  'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"'
```

```sql
SELECT id, title, category, favorite, updated_at
FROM knowledge_points
ORDER BY updated_at DESC;
```

### 备份与恢复

```bash
# 备份
docker compose exec -T mysql sh -c \
  'mysqldump -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" --single-transaction --routines --triggers "$MYSQL_DATABASE"' \
  > shizhi-backup.sql

# 恢复
docker compose exec -T mysql sh -c \
  'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' \
  < shizhi-backup.sql
```

页面右上角也提供 JSON 导出/导入，适合做轻量备份或迁移。

## 适合谁

- 想要一个**不依赖云厂商**的个人知识库
- 正在学习编程、准备考试、做研究，需要整理概念和代码片段
- 喜欢用 Docker 托管自己服务的人
- 想在这个项目基础上做多用户知识库的开发者

## 后续路线

- [x] 知识点 CRUD、搜索、分类、标签、收藏
- [x] MySQL 持久化与 Docker Compose 编排
- [x] JSON 导入导出、旧数据自动迁移
- [x] 健康检查、响应式界面、快捷键
- [ ] 用户登录与多用户数据隔离
- [ ] Markdown 编辑与实时预览
- [ ] 服务端分页与全文检索
- [ ] PWA / 离线模式
- [ ] 公开演示站

如果你希望它变成可公开访问的服务，请先阅读 [公网部署开发路线](docs/PUBLIC_DEPLOYMENT.md)。当前版本是**单用户、无登录**的私人服务，不建议直接暴露到公网。

## 开发与配置

<details>
<summary><strong>项目结构</strong></summary>

```text
.
├── index.html              # 页面结构、内联 SVG 图标
├── styles.css              # 视觉、布局与响应式
├── app.js                  # 交互、筛选、表单、导入导出
├── api.js                  # 前端 API 客户端
├── Dockerfile              # Web 静态镜像（Nginx）
├── nginx.conf              # 静态站点与 /api 反向代理
├── docker-compose.yml      # web + api + mysql 编排
├── .env.example            # 环境变量模板
├── backend/
│   ├── app.py              # FastAPI 路由
│   ├── db.py               # MySQL 连接与初始化
│   ├── models.py           # SQLAlchemy 模型
│   ├── schemas.py          # 请求校验
│   ├── requirements.txt
│   └── Dockerfile
├── docs/
│   └── PUBLIC_DEPLOYMENT.md # 公网化开发路线
├── .github/workflows/ci.yml # GitHub Actions 校验
├── start.bat               # Windows 一键启动
├── LICENSE                 # MIT License
└── README.md
```

</details>

<details>
<summary><strong>环境变量</strong></summary>

复制 `.env.example` 为 `.env` 后修改：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `MYSQL_DATABASE` | `shizhi` | 数据库名 |
| `MYSQL_USER` | `shizhi` | 应用数据库用户 |
| `MYSQL_PASSWORD` | `shizhi_dev_password` | 应用用户密码 |
| `MYSQL_ROOT_PASSWORD` | `shizhi_root_dev_password` | MySQL root 密码 |

`.env` 已被 `.gitignore` 和 `.dockerignore` 排除。公开部署前务必修改默认密码。

</details>

<details>
<summary><strong>API 一览</strong></summary>

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| `GET` | `/api/health` | 健康检查（含数据库） |
| `GET` | `/api/knowledge` | 获取全部知识点 |
| `GET` | `/api/knowledge/{id}` | 获取单条 |
| `POST` | `/api/knowledge` | 新建 |
| `PUT` | `/api/knowledge/{id}` | 更新 |
| `PATCH` | `/api/knowledge/{id}/favorite` | 设置收藏 |
| `DELETE` | `/api/knowledge/{id}` | 删除 |
| `POST` | `/api/knowledge/import` | 合并导入 |

</details>

<details>
<summary><strong>从旧版本迁移</strong></summary>

旧版知识点保存在浏览器 `localStorage`（键名 `shizhi.knowledge.v1`）。新版首次连接空库时，会自动检测同一来源下的旧数据并导入。

如果自动迁移失败，或旧页面使用的是不同地址（`localhost` 与 `127.0.0.1` 属于不同站点），可在旧页面 Console 执行：

```js
copy(localStorage.getItem("shizhi.knowledge.v1"))
```

保存为 `.json` 文件后，在新页面点击导入。

</details>

## 快捷键

| 快捷键 | 作用 |
| --- | --- |
| `/` 或 `Ctrl/Cmd + K` | 聚焦搜索框 |
| `N` | 新建知识点 |
| `Ctrl/Cmd + Enter` | 在编辑窗中保存 |
| `Esc` | 关闭编辑窗 / 清空搜索 |

## Contributing

欢迎提交 Issue、功能建议和 Pull Request。

- 提交前请先确认 `docker compose config --quiet` 通过；
- 前端保持无构建步骤、无外部 CDN；
- 数据库相关改动请同时更新文档；
- 安全问题请优先通过 GitHub Security Advisories 私下报告，不要在公开 Issue 中贴出敏感信息。

如果这个项目对你有帮助，欢迎点一个 **Star** ⭐，这是对作者最直接的鼓励。

## License

本项目基于 [MIT License](LICENSE) 开源，可以自由使用、修改、分发和商用，但请保留原始版权声明。

## 说明

拾知目前是一个面向个人的自托管项目，**没有用户系统**。如果要开放注册或部署到公网，请先完成认证、多租户隔离、HTTPS、限流和备份策略，路线见 [公网部署开发路线](docs/PUBLIC_DEPLOYMENT.md)。

---

<div align="center">

**知识不是用来收藏的，是用来重新遇见的。**

Made with care · FastAPI + MySQL + Docker

</div>

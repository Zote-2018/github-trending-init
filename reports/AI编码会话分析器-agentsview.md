# kenn-io/agentsview - GitHub Trending 深度分析

> 📅 2026-09-07 | ⭐ 5794 stars (+0 today) | 🔧 Go
>
> 🔗 仓库地址: [https://github.com/kenn-io/agentsview](https://github.com/kenn-io/agentsview)
> 📦 Git Clone: \`git clone https://github.com/kenn-io/agentsview.git\`
> 📖 README: [README.md](https://github.com/kenn-io/agentsview#readme)

## 项目概述

agentsview 是一个本地优先（local-first）的 AI 编码 Agent 会话聚合分析工具：用一个 Go 二进制统一发现、索引、搜索本机上 20+ 种编码 Agent（Claude Code、Codex、OpenCode、Gemini CLI、Cursor、Copilot 等）的会话记录，并提供会话全文/语义搜索、token 用量与成本统计、行为分析仪表盘。核心卖点是"一个二进制、无账号、全本地"，会话数据只落在本机 SQLite，Web UI 默认仅绑定 loopback。项目由商业公司 kenn-io 开源（MIT），2026-02-19 创建后 6.5 个月收获约 5.8k stars，处于该赛道头部活跃位置。

## 项目链接

- 仓库地址: https://github.com/kenn-io/agentsview
- 官网与文档: https://agentsview.io（含 quickstart / configuration / semantic-search 等完整文档）
- License: MIT
- 安装: `curl -fsSL https://agentsview.io/install.sh | bash`（macOS/Linux）、Homebrew cask `agentsview`、Docker 镜像 `ghcr.io/kenn-io/agentsview`

## 技术栈

| 类别 | 技术 |
|------|------|
| 后端语言 | Go 1.27（单二进制，module `go.kenn.io/agentsview`） |
| CLI 框架 | cobra |
| REST API | huma/v2（自动生成 OpenAPI 契约） |
| 主存储 | SQLite：纯 Go `modernc.org/sqlite` + 可选 cgo `mattn/go-sqlite3`，FTS5 全文索引 |
| 分析后端 | DuckDB（`duckdb/duckdb-go`，分析镜像）、PostgreSQL（`jackc/pgx/v5`，服务端部署） |
| 对象存储 | `minio-go/v7`（S3 兼容会话根） |
| 语义搜索 | sqlite-vec + 任意 OpenAI 兼容 embedding 端点（opt-in） |
| 文件监听 | fsnotify（实时增量同步） |
| 成本计算 | LiteLLM / OpenRouter 价目表 + 离线兜底，金额用整数 microdollar 表示 |
| MCP | `modelcontextprotocol/go-sdk`（对外暴露 MCP 工具） |
| 前端 | Svelte 5 + Vite（vite-plus）、`@kenn-io/kit-ui` 组件库、Paraglide 多语言、marked/shiki/mermaid、d3/layerchart 图表、orval 生成 API 客户端 |
| 桌面端 | Tauri（Rust 壳）+ Go sidecar，系统托盘 + `agentsview://` 深链 |
| 测试 | 大量 Go 单元/集成测试（含 fuzz、race、testcontainers-Postgres）、Playwright e2e、nilaway/golangci |
| 工程化 | docker-bake 多架构镜像、renovate、.air.toml 热重载 |

## 核心功能

- **20+ Agent 会话统一索引**：每种 Agent 有专用 parser/provider，格式覆盖 JSONL、SQLite、Markdown、加密二进制（如 Antigravity AES-GCM `.pb`）；支持 Claude/Codex 的 `s3://` 会话根跨机器同步
- **会话浏览与搜索**：Dashboard + 会话查看器；FTS5 全量全文搜索 + opt-in 语义搜索（`--semantic` / `--hybrid`），命中内容可反链到具体会话单元
- **Token 用量与成本仪表盘**：按会话/按模型成本拆分、每日支出曲线；prompt-caching 感知计费（cache 创建/读取分开计价）；CLI 侧 `agentsview usage daily`、`session usage`、`stats` 支持 JSON 输出供脚本消费
- **分析洞察**：activity 热力图、工具调用分析、会话 archetype 分类（automation/quick/standard/deep/marathon）、Recent Edits 流（跨会话聚合 Agent 最近改动的文件并链回对应消息）
- **Live 更新**：SSE 实时推送活动会话新消息；daemon 空闲自动退出
- **数据工作台与 Recall**：项目清单/目录映射管理；实验性"知识蒸馏"（Recall corpus）从会话提取可复用知识并反链证据
- **导出**：会话导出 HTML 或发布 GitHub Gist
- **多形态交付**：CLI、Web UI、Tauri 桌面 App（macOS/Win，托盘 + 深链跳转到指定会话）、Docker 容器、`pg serve` 服务端模式
- **其他 CLI 能力**：`capture run` 支持 CI 单次捕获；`doctor`/`health` 诊断；`pg push`/`duckdb push` 数据管道

## 架构设计

```
┌─────────────────────────────────────────────────┐
│ 桌面 App (Tauri 壳, macOS/Win)                    │
│   ├─ 深链 agentsview://sessions/<id>             │
│   └─ 系统托盘 / 更新检查                           │
├─────────────────────────────────────────────────┤
│ Web UI (Svelte 5 + kit-ui) ◄─ loopback:8080 ─┐   │
├────────────────────────────────────────────────┤
│        Go 单二进制 (cmd/agentsview)              │
│  CLI (cobra) │ daemon(常驻,空闲自退) │ REST API    │
│  (只读命令冷启动直连 SQLite；需新鲜/写入才拉起daemon) │
├────────────────────────────────────────────────┤
│  ① parser 层：per-Agent 格式解析器（核心护城河）    │
│  ② sync 层：fsnotify 监听 + 周期轮询 + S3 增量同步  │
│  ③ 分析层：pricing / vector / recall / insight    │
│  ④ storage 层：SQLite(主) + DuckDB + PostgreSQL    │
└─────────────────────────────────────────────────┘
```

**核心流程**：

1. **发现**：首次运行扫描各 Agent 默认目录（Claude `~/.claude/projects/`、Codex `~/.codex/sessions/`、OpenCode `~/.local/share/opencode/` 等），目录均可经 env / `config.toml` 覆盖
2. **解析**：parser 层按 Agent 特有格式（JSONL/SQLite/加密二进制/Markdown）重建会话结构化数据（消息、thinking、工具调用、diff）
3. **存储**：结构化会话入库本地 SQLite，附 FTS5 全文索引；可选向量化做语义检索
4. **同步**：fsnotify 实时监听活动会话 + 周期轮询兜底（Aider 等每 15 分钟），S3 根按 ETag/大小/修改时间增量下载
5. **服务**：daemon/CLI 读取归档生成报表；Web UI 经 huma OpenAPI 接口 + SSE 展示

**关键设计模式**：

- **冷热分离的 daemon 策略**——只读命令直接读 SQLite 归档保持脚本毫秒级启动；需要新鲜数据或写操作时自动拉起 daemon，闲置自退出
- **插件式 Provider 抽象**——`provider.go` + capabilities/taxonomy 描述各 Agent 支持能力，新增 Agent 只需实现解析 provider
- **本地优先 + 可选上云**——默认全本地 SQLite；需要共享时 push 到 PostgreSQL / DuckDB / S3，架构上存储与读取解耦
- **安全默认**——仅绑 loopback + Host 头校验防 DNS-rebinding，远程暴露需显式 `--require-auth`

## 亮点分析

1. **精准切中"多 Agent 时代"的痛点**：开发者同时用 Claude Code / Codex / OpenCode / Cursor，会话与成本散落各处。agentsview 以 Agent 无关的统一索引切入，而不是只服务单一 Agent——与 ccusage、Claude Code 内置 `/cost` 等单点工具形成代差。

2. **会话解析深度是真正的护城河**：`internal/parser/` 有 200+ 文件，覆盖非官方、快速漂移的存储格式（含 AES-GCM 加密解密、SQLite 直读、Markdown 切分），且用 fuzz/race/real-testdata 测试锁住兼容性。这类"逆向各 Agent 私有格式"的工作量大且持续维护成本高，是新进入者最难复制的部分。

3. **成本计算工程细节讲究**：prompt-caching 感知（cache 写入/读取分开算）、LiteLLM + OpenRouter 价目表双源 + 离线兜底、金额一律用整数 microdollar 表达避免浮点误差，支持 `--all --json` 一行接入 shell 状态栏。

4. **本地优先与隐私设计克制**：Web UI 默认只绑 127.0.0.1 并校验 Host 头防 DNS-rebinding；会话文件只读；S3 只增量拉取变更——对把"代码会话"这种高度敏感数据放心交给第三方工具的顾虑，给出了务实回答。

5. **工程成熟度与测试纪律**：6.5 个月 1182 commits、parser 层几乎每个格式都有真实验证 + 跨平台（windows/unix/other）文件分离 + nilaway 静态检查 + testcontainers 集成测试，说明 kenn-io 把它当商业产品而非玩具在维护。

6. **桌面端做"薄壳"而非重写**：Tauri 只负责编译 Go sidecar、开本地端口、webview 加载、托盘与深链——前端与 CLI 能力完全复用，避免双实现漂移，是桌面化成本最低的正确姿势。

## 适用场景

| 场景 | 适用性 | 说明 |
|------|--------|------|
| 多 Agent 重度用户用量盘点 | ★★★★★ | 统一看 Claude Code + Codex + OpenCode 等的 token 成本，定位"钱花哪了" |
| 会话回顾与检索 | ★★★★★ | 跨 Agent 全文/语义搜索历史会话，回忆"上次那个坑怎么解决的" |
| 团队/个人成本审计 | ★★★★☆ | 按天/模型/Agent 拆分的报表，CLI JSON 输出可接内部脚本 |
| 服务端多用户部署 | ★★★★☆ | PostgreSQL 后端 + `pg serve`，配合 `--require-auth` 可对团队开放 |
| 会话数据归档分析 | ★★★☆☆ | DuckDB push 后可用 SQL 做大跨度分析 |
| 非 AI 编程场景 | ★☆☆☆☆ | 只对编码 Agent 会话数据有意义 |

## 学习价值

1. **对抗性格式解析工程**：如何为 20+ 非官方、随版本漂移的会话格式设计统一的 Provider 抽象（capabilities/taxonomy/discovery/source-set），并用真实验证数据 + fuzz 锁兼容性
2. **本地优先产品架构**：SQLite 为主 + DuckDB/PostgreSQL 可选的存储解耦设计，以及 daemon 冷热启动（只读直连、写时拉起、空闲自退）的状态机实现
3. **成本核算的正确姿势**：价格表双源 + 离线兜底、缓存感知计费、microdollar 整数金额等避免浮点与价目漂移的工程手法
4. **安全默认的 Web 服务**：loopback 绑定 + Host 头校验防 DNS-rebinding、`--require-auth` 显式放行——本地工具暴露为 HTTP 服务的安全基线
5. **桌面壳集成模式**：Tauri 编译 Go 二进制为 sidecar + 系统托盘 + 自定义 URL scheme 深链，本地工具低成本桌面化的完整范例
6. **监控型数据管道的同步设计**：fsnotify 实时监听 + 周期轮询兜底 + S3 增量变更检测的取舍，值得做本地索引类工具借鉴

---
*Generated by github-trending-analyzer | 2026-09-07*

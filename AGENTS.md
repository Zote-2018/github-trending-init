# AGENTS.md

AI agent operational notes for github-trending-init. Complements `CLAUDE.md` (architecture & conventions).

## 运行时陷阱

### 必须安装的外部依赖

- **claude-cli 模式**: 需要 `claude` CLI 已安装并登录，需要 PowerShell 7 (`pwsh`) 在 PATH 中
- **api 模式**: 无需额外 CLI，通过 `node-fetch` 直接调 OpenAI 兼容 API（已在 dependencies），无需 pwsh
- 调度器始终使用 `shell: 'cmd.exe'`——与分析器的 shell 不一致

### 模块系统

- `package.json` 声明 `"type": "commonjs"`，但全部源码使用 ESM `import` 语法——`tsx` 在运行时负责转译
- `import fetch from 'node-fetch'` 依赖 `tsconfig.json` 的 `esModuleInterop: true`（因为是 CJS v2 包）
- `outDir: "dist"` 在 tsconfig 中，但**从未使用**——无 build 步骤，`tsx` 直接执行 TypeScript

### 每次只分析一个项目

`pickTopNew()` 只返回 trending 列表中**第一个**未分析过的项目，不是全部。如果要批量分析，必须修改此逻辑。

### 静默跳过

当所有 trending 项目都已存在于 `data/history.json` 时，程序输出警告并**正常退出**（非错误），不生成新报告。

## 文件注意事项

### 数据文件（`data/`）

- `history.json` 是真实数据源；`catalog.json` 每次运行通过 `updateCatalog()` 从 history 完整重建
- 无备份机制——手动编辑这两个文件需保持一致性
- 报告文件（`reports/`）无限增长，无过期/轮转机制

### 搜索

`npm run search` 执行**两阶段搜索**:
1. 先对 `catalog.json` 索引做加权匹配（标签权重 10 > 语言 5 > 仓库名 4 > 摘要 3）
2. 再对已排序结果之外的报告文件全文做子串搜索

## 平台约束

- **仅 Windows**: 调度器通过 `schtasks` 注册定时任务，需要管理员权限
- **无测试**: 没有测试框架、CI 配置或 lint 规则
- **无配置**: 硬编码 `https://github.com/trending`，不支持日期/语言筛选参数

## 分析器模式

`analyzer.ts` 支持两种分析模式，由 `config.json` 的 `provider` 字段控制：

- **`"claude-cli"`**（默认）：通过 PowerShell 将 prompt pipe 给本地 `claude` CLI，需 CLI 已登录
- **`"api"`**：通过 `node-fetch` 调 OpenAI 兼容 Chat Completions API（支持 OpenAI、GLM、DeepSeek 等任何兼容接口）

配置文件 `config.json`（已加入 `.gitignore`）：
```json
{
  "provider": "api",
  "api": {
    "baseUrl": "https://api.openai.com/v1",
    "apiKey": "sk-xxx",
    "model": "gpt-4o"
  }
}
```

`validateConfig()` 在 `provider === "api"` 时校验 apiKey/baseUrl/model 非空，不满足则抛出。

### Claude CLI 调用细节

`analyzer.ts` 的 CLI 模式调用链：
1. 构建 prompt → 写入临时文件（`os.tmpdir()`）
2. 通过 PowerShell 执行 `Get-Content '临时文件路径' -Raw | claude -p`，将 prompt 通过 stdin pipe 传入
3. 超时 10 分钟，缓冲区 10MB
4. 总是清理临时文件（`finally` 块）
5. 从响应中用正则提取 `TAGS:` 和 `SUMMARY:` 行，然后从 markdown 正文中移除这两行

API 模式调用 `${baseUrl}/chat/completions`，通过 `AbortController` 实现 10 分钟超时，`node-fetch` 发起 POST。

---

<!-- merged-from: CLAUDE.md 2026-08-16 -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目简介

GitHub Trending 每日自动分析工具。抓取 GitHub Trending 页面，选取未分析过的新项目，调用本地 Claude CLI 生成中文深度分析报告，并维护历史索引和可搜索的目录。

## 常用命令

```bash
# 运行一次分析（抓取 trending → 选项目 → 生成报告）
npm start

# 注册/注销 Windows 定时任务（每天凌晨 1:00）
npm run schedule
npm run unschedule

# 搜索已分析的项目（按标签、语言、摘要匹配）
npm run search "关键词"

# 直接运行（开发时）
npx tsx src/index.ts
```

无需 build 步骤，`tsx` 直接执行 TypeScript。无测试框架。

## 架构

单次运行流程（`src/index.ts` 主入口）：

1. **trending.ts** — `fetchTrending()` 用 node-fetch + cheerio 抓取 `github.com/trending` HTML，解析出项目列表。`pickTopNew()` 跳过已分析项目，返回第一个新项目。
2. **analyzer.ts** — `analyzeRepo()` 将项目信息填入 prompt 模板，通过 `execSync` 调用 `claude -p` 命令行生成分析。从响应中提取 `TAGS:` 和 `SUMMARY:` 行作为结构化元数据。
3. **history.ts** — 读写 `data/history.json`，维护已分析项目的去重记录。
4. **catalog.ts** — `updateCatalog()` 从历史记录构建 `data/catalog.json`，包含按 tag 和 language 分组的倒排索引。`searchCatalog()` 提供加权搜索（标签权重 > 语言 > 仓库名 > 摘要）。
5. **scheduler.ts** — 通过 Windows `schtasks` 注册每日定时任务。
6. **search.ts** — CLI 搜索入口，先搜 catalog 索引，再全文搜索报告文件内容。

## 关键约定

- **报告格式**：`reports/{date}-{owner}-{repo}.md`，含标准 front matter（日期、星标、语言、链接）
- **数据文件**：`data/history.json`（分析历史）和 `data/catalog.json`（搜索索引），均 JSON 格式
- **Claude CLI 依赖**：analyzer 模块通过 shell 调用系统安装的 `claude` CLI，超时 10 分钟
- **Windows 专用**：定时任务使用 `schtasks`，scheduler 通过 `cmd.exe` 执行
- **中文输出**：所有报告和分析结果为中文

## 类型定义（src/types.ts）

- `TrendingRepo` — trending 项目原始数据（名称、描述、语言、星标数）
- `HistoryRecord` — 历史记录（含标签、摘要、报告文件路径）
- `CatalogEntry` — 目录条目；`Catalog` 包含 `byTag`/`byLanguage` 倒排索引

<!-- agent-sync:memory begin v1 -->
# 记忆与 Skill 约定（agent-sync 维护区块，勿手改）

## 项目记忆（.agents/memory/）
- 任务开始先读 `.agents/memory/MEMORY.md` 索引，按需读对应类型文件
- 决策 → decisions.md；踩坑/已知问题 → known-issues.md；待办 → todo.md；偏好 → preferences.md
- 条目格式：`### YYYY-MM-DD 标题` + 正文；写入后同步更新 MEMORY.md 索引行
- 临时记忆放 `tmp/`（一话题一文件），会话结束尽量删除；超 7 天由 agent-sync clean 清理
- 绝不把密码/token/密钥写入记忆

## 会话存档（.agents/sessions/）
- 本会话结束前执行 `agent-sync session-save --agent <你的agent名>`
  （PATH 无该命令时：`uv run --project "D:/work/agent-control" agent-sync session-save --agent <名>`）
- 存档为原始对话转档，供"沉淀记忆"时总结

## 项目 Skill（.agents/skills/）
- 本项目专属 skill 位于 `D:/work/study/github-trending-init/.agents/skills/`（需当前 agent 已配置该读取位）

## 记忆沉淀
- 用户说"沉淀记忆 / 总结记忆"时执行 memory-distill skill：读 `.agents/sessions/` 未总结存档，
  项目经验写入上述类型文件，你的操作习惯写入自家 `~/.<agent>/notes/` 并更新其索引
<!-- agent-sync:memory end -->

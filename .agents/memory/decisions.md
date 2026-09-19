# 决策记录（decisions）

条目格式：`### YYYY-MM-DD 标题` + 背景/决策/理由。

### 2026-09-18 分析器支持 api / claude-cli 双模式（config.json 的 provider 字段）

（决策实际于 2026-05-24 落地，commit 834f2b2 + 1ff43d6；自旧记忆系统迁移入库）
- 背景：项目用 LLM 分析 GitHub trending 仓库，最初仅依赖 claude CLI，受 429 限流与 pwsh 依赖制约。
- 决策：`src/config.ts` 定义 `provider: 'api' | 'claude-cli'`（config.json 配置，缺省 claude-cli）；api 模式经 node-fetch 直调 OpenAI 兼容 API（无需 pwsh），claude-cli 模式需 `claude` CLI 已登录 + PowerShell 7 在 PATH。当前 config.json 取 api 模式。
- 理由：api 模式绕开 CLI 限额、部署更轻；CLI 模式保留作后备。

### 2026-09-18 报告文件名改为 {中文标题}-{repo名}.md 格式

（决策实际于 2026-05-24 落地，commit 6e785dd；自旧记忆系统迁移入库）
- 决策：分析 prompt 新增结构化字段 `TITLE: 4-10字中文简称`（src/analyzer.ts 约 55 行），`parseAnalysis()` 解析 TITLE，`analyze-one.ts`/`index.ts` 以 `{title}-{repo名}.md` 命名报告（如 `reports/代码知识图谱-codegraph.md`）；`data/history.json` 中历史 reportFile 路径已同步。
- 理由：中文标题比 `{date}-{owner}-{repo}.md` 更直观，便于文件系统内识别项目内容。

### 2026-09-18 分析报告模板结构（标准章节 + TAGS/SUMMARY/TITLE 结构化字段）

（约定实际于 2026-05-21 确立；自旧记忆系统迁移入库，已对照 src/analyzer.ts 核实）
- 报告标准章节：项目概述、项目链接、技术栈、核心功能、架构设计、亮点分析、适用场景、学习价值。
- 三个结构化字段（各占一行，用于自动索引与命名）：`TITLE: 4-10字中文简称`、`SUMMARY: 一句话中文摘要（<100字）`、`TAGS: 5-8 个英文小写标签`；parseAnalysis() 解析后从正文剥离这三个字段。
- 角色 prompt："You are a senior GitHub project analyst. Analyze the following trending GitHub repository thoroughly and respond in Chinese."

### 2026-09-18 数据目录与索引约定（history.json 为源、catalog.json 派生）

（约定实际于 2026-05-21 确立；自旧记忆系统迁移入库，已对照源码核实）
- `data/history.json` 是真实数据源，手动编辑需保持一致性；`data/catalog.json` 每次运行由 `updateCatalog()`（src/catalog.ts）从 history 完整重建，含 byTag/byLanguage 倒排索引，不手工维护。
- 搜索加权（src/catalog.ts）：标签命中 10 分 > 语言 5 分 > 仓库名 4 分 > 摘要 3 分，按总分倒序返回。
- 补充实现细节：claude-cli 模式经 `pwsh -NoProfile -Command "Get-Content <tmpfile> | claude -p"` 调用，超时 600 秒（analyzer.ts:112-114；旧记忆误记 5 分钟，以代码为准）；api 模式下仓库元数据优先用 config.json 的 githubToken 调 GitHub API，未配置回退页面抓取。

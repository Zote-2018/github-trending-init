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
- **Claude CLI 依赖**：analyzer 模块通过 shell 调用系统安装的 `claude` CLI，超时 5 分钟
- **Windows 专用**：定时任务使用 `schtasks`，scheduler 通过 `cmd.exe` 执行
- **中文输出**：所有报告和分析结果为中文

## 类型定义（src/types.ts）

- `TrendingRepo` — trending 项目原始数据（名称、描述、语言、星标数）
- `HistoryRecord` — 历史记录（含标签、摘要、报告文件路径）
- `CatalogEntry` — 目录条目；`Catalog` 包含 `byTag`/`byLanguage` 倒排索引

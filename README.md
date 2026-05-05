# GitHub Trending Daily Analyzer

每日自动抓取 GitHub Trending，选取新项目，调用 Claude 生成中文深度分析报告。

## 功能

- 抓取 GitHub Trending 页面，自动去重已分析过的项目
- 调用本地 Claude CLI 对项目进行多维度分析（技术栈、架构设计、亮点、学习价值等）
- 生成结构化 Markdown 报告（含标签和摘要）
- 维护可搜索的索引目录，支持按标签、语言、关键词检索
- 支持 Windows 定时任务，每天自动运行

## 安装

```bash
git clone https://github.com/smile/github-trending-init.git
cd github-trending-init
npm install
```

需要本地安装 [Claude CLI](https://docs.anthropic.com/en/docs/claude-code) 并已登录。

## 使用

### 运行一次分析

```bash
npm start
```

流程：抓取 Trending → 选取首个新项目 → Claude 深度分析 → 生成报告 → 更新索引

### 搜索已分析的项目

```bash
npm run search "关键词"
npm run search "agent"
npm run search "rust"
```

搜索范围包括标签、语言、仓库名、摘要，以及报告正文全文。

### 注册每日定时任务（Windows）

```bash
npm run schedule    # 注册，每天凌晨 1:00 执行
npm run unschedule  # 取消
```

## 输出

| 路径 | 说明 |
|---|---|
| `reports/{date}-{owner}-{repo}.md` | 分析报告 |
| `data/history.json` | 分析历史记录 |
| `data/catalog.json` | 搜索索引（含按 tag/language 分组） |

## 报告内容

每份报告包含以下维度：

- 项目概述与链接
- 技术栈分析
- 核心功能说明
- 架构设计解析
- 亮点分析
- 适用场景与学习价值
- 自动标签分类与中文摘要

## 技术栈

TypeScript + tsx（零构建直接运行）、node-fetch + cheerio（HTML 抓取解析）、Claude CLI（AI 分析）

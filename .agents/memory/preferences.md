# 项目偏好（preferences）

条目格式：`### YYYY-MM-DD 标题`。本文件可为空。

### 2026-09-18 分析 GitHub 项目必须落盘规范报告，不接受聊天式交付

（2026-09-07 agentsview 分析会话中用户明确纠偏："文件名称呢 中文- github名称 你没按规矩"）
- 用户让分析某个 GitHub 项目时，最终交付必须是 `reports/{TITLE中文4-10字}-{repo名}.md` 报告文件（front matter 日期/星标/语言/链接 + 八节正文 + footer，参照 `reports/代码知识图谱-codegraph.md` 模板），并在聊天里只做摘要。
- 数据同步规矩：history.json 用项目自身函数 addRecord 追加（`npx tsx -e` 调 src/history.ts，不手改 JSON）；catalog.json 由 updateCatalog 从 history 全量重建；落盘后校验 byTag/byLanguage 命中。
- 已有实锤调研材料（GitHub API/源码直读）时不重复走 `npm run analyze`——省一次外部 LLM 调用费且避免编造；直接按模板落盘 + 项目函数更新索引。
- 实证：agentsview 报告已按此流程补交并提交（commit 893ca76；2026-09-18 核实 reports/AI编码会话分析器-agentsview.md 与 history.json 末条均就位，12 条记录）。

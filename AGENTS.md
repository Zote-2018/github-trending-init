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
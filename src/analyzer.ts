import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { TrendingRepo } from './types';

const ANALYSIS_PROMPT = `You are a senior GitHub project analyst. Analyze the following trending GitHub repository thoroughly and respond in Chinese.

Repository: {repo}
URL: {url}
Description: {description}
Language: {language}
Stars: {stars} (+{todayStars} today)

Browse the repository URL above. Analyze its README, code structure, and documentation. Then provide:

## 项目概述
What does this project do? What problem does it solve? (3-5 sentences)

## 项目链接
List the key links:
- 仓库地址: {url}
- 关键文档/示例链接 (based on what you find in the repo)

## 技术栈
List ALL main technologies, frameworks, libraries, and tools used. Be exhaustive.

## 核心功能
List the key features as bullet points. Be specific about what each feature does.

## 架构设计
Describe the high-level architecture: how components fit together, data flow, key design patterns.

## 亮点分析
What makes this project stand out from similar projects? What clever techniques or design choices are notable?

## 适用场景
Who should use this? What real-world problems does it solve? Rate suitability for different scenarios.

## 学习价值
What can developers learn from studying this codebase? What patterns/techniques are worth studying?

## 标签与分类
At the end, output EXACTLY this format for automated indexing (one line, no other text on this line):
TAGS: tag1, tag2, tag3, tag4, tag5

Choose 5-8 tags from: the language, framework names, domain (e.g. ai, web, database, devops, cli, api, mobile, blockchain, security), project type (e.g. library, framework, tool, platform, sdk), and key features. Use English lowercase tags.

Also output EXACTLY this format for summary (one line, no other text on this line):
SUMMARY: 一句话中文摘要本项目 (under 100 chars)

Respond in well-formatted Markdown. Be specific, insightful, and thorough.`;

export interface AnalysisResult {
  content: string;
  tags: string[];
  summary: string;
}

export function analyzeRepo(repo: TrendingRepo): AnalysisResult {
  const prompt = ANALYSIS_PROMPT
    .replace(/\{repo\}/g, repo.name)
    .replace(/\{url\}/g, repo.url)
    .replace(/\{description\}/g, repo.description || 'N/A')
    .replace(/\{language\}/g, repo.language || 'N/A')
    .replace(/\{stars\}/g, String(repo.stars))
    .replace(/\{todayStars\}/g, String(repo.todayStars));

  const tmpFile = path.join(os.tmpdir(), `claude-prompt-${Date.now()}.txt`);
  fs.writeFileSync(tmpFile, prompt, 'utf-8');

  let raw: string;
  try {
    raw = execSync(`claude -p "$(cat '${tmpFile.replace(/\\/g, '/')}')"`, {
      encoding: 'utf-8',
      timeout: 300_000,
      maxBuffer: 10 * 1024 * 1024,
      shell: 'bash',
    }).trim();
  } catch (err: any) {
    raw = `分析失败: ${err.message}\n\n原始错误: ${err.stderr?.toString()?.slice(0, 500) ?? 'N/A'}`;
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }

  // Extract tags and summary from the response
  const tagsMatch = raw.match(/^TAGS:\s*(.+)$/m);
  const summaryMatch = raw.match(/^SUMMARY:\s*(.+)$/m);

  const tags = tagsMatch
    ? tagsMatch[1].split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
    : [repo.language?.toLowerCase() || 'unknown'];

  const summary = summaryMatch
    ? summaryMatch[1].trim()
    : repo.description?.slice(0, 100) || '无描述';

  // Remove the TAGS and SUMMARY lines from the markdown content
  const content = raw
    .replace(/^TAGS:.*$\n?/m, '')
    .replace(/^SUMMARY:.*$\n?/m, '')
    .trim();

  return { content, tags, summary };
}

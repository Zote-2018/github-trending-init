import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import fetch from 'node-fetch';
import { TrendingRepo } from './types';
import { loadConfig, validateConfig, AppConfig } from './config';

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

Also output EXACTLY this format for title (one line, no other text on this line):
TITLE: 4-10字中文简称 (用作文件名，简短概括项目，不含特殊符号)

Respond in well-formatted Markdown. Be specific, insightful, and thorough.`;

export interface AnalysisResult {
  content: string;
  tags: string[];
  summary: string;
  title: string;
}

function buildPrompt(repo: TrendingRepo): string {
  return ANALYSIS_PROMPT
    .replace(/\{repo\}/g, repo.name)
    .replace(/\{url\}/g, repo.url)
    .replace(/\{description\}/g, repo.description || 'N/A')
    .replace(/\{language\}/g, repo.language || 'N/A')
    .replace(/\{stars\}/g, String(repo.stars))
    .replace(/\{todayStars\}/g, String(repo.todayStars));
}

function parseAnalysis(raw: string, repo: TrendingRepo): AnalysisResult {
  const tagsMatch = raw.match(/^TAGS:\s*(.+)$/m);
  const summaryMatch = raw.match(/^SUMMARY:\s*(.+)$/m);

  const tags = tagsMatch
    ? tagsMatch[1].split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
    : [repo.language?.toLowerCase() || 'unknown'];

  const summary = summaryMatch
    ? summaryMatch[1].trim()
    : repo.description?.slice(0, 100) || '无描述';

  const titleMatch = raw.match(/^TITLE:\s*(.+)$/m);
  const title = titleMatch
    ? titleMatch[1].trim().replace(/[\\/:*?"<>|]/g, '')
    : repo.name.split('/')[1];

  const content = raw
    .replace(/^TAGS:.*$\n?/m, '')
    .replace(/^SUMMARY:.*$\n?/m, '')
    .replace(/^TITLE:.*$\n?/m, '')
    .trim();

  return { content, tags, summary, title };
}

function analyzeRepoViaCli(repo: TrendingRepo): AnalysisResult {
  const prompt = buildPrompt(repo);
  const tmpFile = path.join(os.tmpdir(), `claude-prompt-${Date.now()}.txt`);
  fs.writeFileSync(tmpFile, prompt, 'utf-8');

  let raw: string;
  try {
    raw = execSync(`pwsh -NoProfile -Command "Get-Content '${tmpFile.replace(/\\/g, '/')}' -Raw | claude -p"`, {
      encoding: 'utf-8',
      timeout: 600_000,
      maxBuffer: 10 * 1024 * 1024,
    }).trim();
  } catch (err: any) {
    raw = `分析失败: ${err.message}\n\n原始错误: ${err.stderr?.toString()?.slice(0, 500) ?? 'N/A'}`;
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }

  return parseAnalysis(raw, repo);
}

async function analyzeRepoViaApi(repo: TrendingRepo, config: AppConfig): Promise<AnalysisResult> {
  const prompt = buildPrompt(repo);
  const url = `${config.api.baseUrl.replace(/\/+$/, '')}/chat/completions`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 600_000);

  let raw: string;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.api.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.api.model,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      raw = `分析失败: HTTP ${res.status} ${res.statusText}\n\n原始错误: ${errText.slice(0, 500)}`;
    } else {
      const data: any = await res.json();
      raw = data.choices?.[0]?.message?.content?.trim() ?? '';
      if (!raw) {
        raw = `分析失败: API 返回为空\n\n原始响应: ${JSON.stringify(data).slice(0, 500)}`;
      }
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      raw = '分析失败: API 请求超时 (10分钟)';
    } else {
      raw = `分析失败: ${err.message}`;
    }
  } finally {
    clearTimeout(timer);
  }

  return parseAnalysis(raw, repo);
}

export async function analyzeRepo(repo: TrendingRepo): Promise<AnalysisResult> {
  const config = loadConfig();
  validateConfig(config);

  console.log(`🔧 分析模式: ${config.provider === 'api' ? `API (${config.api.model})` : 'Claude CLI'}`);

  if (config.provider === 'api') {
    return analyzeRepoViaApi(repo, config);
  }
  return analyzeRepoViaCli(repo);
}
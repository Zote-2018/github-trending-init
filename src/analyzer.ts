import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { TrendingRepo } from './types';

const ANALYSIS_PROMPT = `You are a GitHub project analyst. Analyze the following trending GitHub repository and respond in Chinese.

Repository: {repo}
URL: {url}
Description: {description}
Language: {language}
Stars: {stars} (+{todayStars} today)

Please use your web search capability or knowledge to analyze this repository and provide:

## 项目概述
Brief overview of what this project does.

## 技术栈
Main technologies, frameworks, and dependencies used.

## 核心功能
Key features and capabilities.

## 亮点分析
What makes this project stand out.

## 适用场景
Who should use this and for what.

## 学习价值
What developers can learn from this project.

Respond in well-formatted Markdown. Be specific and insightful.`;

export function analyzeRepo(repo: TrendingRepo): string {
  const prompt = ANALYSIS_PROMPT
    .replace('{repo}', repo.name)
    .replace('{url}', repo.url)
    .replace('{description}', repo.description || 'N/A')
    .replace('{language}', repo.language || 'N/A')
    .replace('{stars}', String(repo.stars))
    .replace('{todayStars}', String(repo.todayStars));

  // Write prompt to temp file to avoid shell escaping issues
  const tmpFile = path.join(os.tmpdir(), `claude-prompt-${Date.now()}.txt`);
  fs.writeFileSync(tmpFile, prompt, 'utf-8');

  try {
    const result = execSync(`claude -p "$(cat '${tmpFile.replace(/\\/g, '/')}')"`, {
      encoding: 'utf-8',
      timeout: 300_000,
      maxBuffer: 10 * 1024 * 1024,
      shell: 'bash',
    });
    return result.trim();
  } catch (err: any) {
    return `分析失败: ${err.message}\n\n原始错误: ${err.stderr?.toString()?.slice(0, 500) ?? 'N/A'}`;
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

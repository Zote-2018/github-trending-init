import * as fs from 'fs';
import * as path from 'path';

const CONFIG_FILE = path.resolve(__dirname, '..', 'config.json');

export interface ApiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface AppConfig {
  provider: 'api' | 'claude-cli';
  api: ApiConfig;
  /** 可选 GitHub Token，用于 API 获取 repo 元信息（stars/language/description）。不填则回退到页面抓取 */
  githubToken?: string;
}

const DEFAULT_CONFIG: AppConfig = {
  provider: 'claude-cli',
  api: {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o',
  },
  githubToken: '',
};

export function loadConfig(): AppConfig {
  if (!fs.existsSync(CONFIG_FILE)) return DEFAULT_CONFIG;
  try {
    const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    return { ...DEFAULT_CONFIG, ...raw, api: { ...DEFAULT_CONFIG.api, ...raw.api } };
  } catch {
    console.warn('⚠️ config.json 格式错误，使用默认配置（claude-cli）');
    return DEFAULT_CONFIG;
  }
}

export function validateConfig(config: AppConfig): void {
  if (config.provider === 'api') {
    if (!config.api.apiKey) {
      throw new Error('API 模式需要配置 api.apiKey，请在 config.json 中填入 API Key');
    }
    if (!config.api.baseUrl) {
      throw new Error('API 模式需要配置 api.baseUrl');
    }
    if (!config.api.model) {
      throw new Error('API 模式需要配置 api.model');
    }
  }
}
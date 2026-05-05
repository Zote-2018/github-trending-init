import * as fs from 'fs';
import * as path from 'path';
import { History, HistoryRecord } from './types';

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function loadHistory(): History {
  ensureDataDir();
  if (!fs.existsSync(HISTORY_FILE)) return { records: [] };
  return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
}

export function saveHistory(history: History): void {
  ensureDataDir();
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
}

export function getExistingRepos(history: History): string[] {
  return history.records.map(r => r.repo);
}

export function addRecord(history: History, record: HistoryRecord): History {
  history.records.push(record);
  return history;
}

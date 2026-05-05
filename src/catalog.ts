import * as fs from 'fs';
import * as path from 'path';
import { Catalog, CatalogEntry, History } from './types';

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const CATALOG_FILE = path.join(DATA_DIR, 'catalog.json');

export function updateCatalog(history: History): void {
  const entries: CatalogEntry[] = history.records.map(r => ({
    repo: r.repo,
    url: `https://github.com/${r.repo}`,
    date: r.date,
    language: r.language,
    tags: r.tags,
    summary: r.summary,
    reportFile: r.reportFile,
  }));

  // Build lookup indexes
  const byTag: Record<string, string[]> = {};
  const byLanguage: Record<string, string[]> = {};

  for (const entry of entries) {
    // Index by tag
    for (const tag of entry.tags) {
      if (!byTag[tag]) byTag[tag] = [];
      byTag[tag].push(entry.repo);
    }
    // Index by language
    const lang = entry.language?.toLowerCase() || 'unknown';
    if (!byLanguage[lang]) byLanguage[lang] = [];
    byLanguage[lang].push(entry.repo);
  }

  const catalog: Catalog = { entries, byTag, byLanguage };

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(CATALOG_FILE, JSON.stringify(catalog, null, 2), 'utf-8');
}

export function searchCatalog(query: string): CatalogEntry[] {
  if (!fs.existsSync(CATALOG_FILE)) return [];
  const catalog: Catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf-8'));

  const q = query.toLowerCase();
  const scored = new Map<string, number>();

  for (const entry of catalog.entries) {
    let score = 0;

    // Tag match (highest weight)
    if (entry.tags.some(t => t.includes(q))) score += 10;

    // Language match
    if (entry.language?.toLowerCase().includes(q)) score += 5;

    // Repo name match
    if (entry.repo.toLowerCase().includes(q)) score += 4;

    // Summary match
    if (entry.summary.toLowerCase().includes(q)) score += 3;

    if (score > 0) scored.set(entry.repo, score);
  }

  // Sort by score desc, return entries
  return [...scored.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([repo]) => catalog.entries.find(e => e.repo === repo)!)
    .filter(Boolean);
}

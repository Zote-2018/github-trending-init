import { searchCatalog } from './catalog';
import { loadHistory } from './history';
import * as fs from 'fs';
import * as path from 'path';

const query = process.argv.slice(2).join(' ').trim();
if (!query) {
  console.log('Usage: npm run search <keyword>');
  console.log('Example: npm run search "agent orchestration"');
  process.exit(1);
}

console.log(`🔍 搜索: "${query}"\n`);

const results = searchCatalog(query);

if (results.length === 0) {
  console.log('未找到匹配的项目。');
  process.exit(0);
}

console.log(`找到 ${results.length} 个相关项目:\n`);

for (const entry of results) {
  console.log(`📦 ${entry.repo}`);
  console.log(`   🔗 ${entry.url}`);
  console.log(`   📅 ${entry.date} | 🔧 ${entry.language || 'N/A'}`);
  console.log(`   🏷️  ${entry.tags.join(', ')}`);
  console.log(`   📝 ${entry.summary}`);
  console.log(`   📄 ${entry.reportFile}`);
  console.log();
}

// Also search in report file contents for deeper match
const history = loadHistory();
const REPORTS_DIR = path.resolve(__dirname, '..', 'reports');
const contentMatches: string[] = [];

for (const record of history.records) {
  if (results.some(r => r.repo === record.repo)) continue; // already matched
  const reportPath = path.resolve(__dirname, '..', record.reportFile);
  if (!fs.existsSync(reportPath)) continue;
  const content = fs.readFileSync(reportPath, 'utf-8').toLowerCase();
  if (content.includes(query.toLowerCase())) {
    contentMatches.push(record.repo);
  }
}

if (contentMatches.length > 0) {
  console.log(`--- 内容匹配（报告正文中含 "${query}"）---\n`);
  for (const repo of contentMatches) {
    const record = history.records.find(r => r.repo === repo);
    if (!record) continue;
    console.log(`📦 ${record.repo} | 📄 ${record.reportFile}`);
  }
}

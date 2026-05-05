import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { TrendingRepo } from './types';

const TRENDING_URL = 'https://github.com/trending';

export async function fetchTrending(): Promise<TrendingRepo[]> {
  const res = await fetch(TRENDING_URL);
  if (!res.ok) throw new Error(`Failed to fetch trending: ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  const repos: TrendingRepo[] = [];
  $('article.Box-row').each((_, el) => {
    const $el = $(el);
    const name = $el.find('h2 a').attr('href')?.replace(/^\//, '') ?? '';
    const description = $el.find('p').text().trim();
    const language = $el.find('[itemprop="programmingLanguage"]').text().trim();
    const starsText = $el.find('.Link--muted.d-inline-block.mr-3').first().text().trim();
    const stars = parseStarCount(starsText);
    const todayStarsText = $el.find('.float-sm-right').text().trim();
    const todayStars = parseStarCount(todayStarsText);

    repos.push({ name, description, language, stars, todayStars, url: `https://github.com/${name}` });
  });

  return repos;
}

function parseStarCount(text: string): number {
  if (!text) return 0;
  const cleaned = text.replace(/,/g, '').replace(/stars?/gi, '').trim();
  const num = parseFloat(cleaned);
  if (cleaned.toLowerCase().includes('k')) return Math.round(num * 1000);
  return Math.round(num) || 0;
}

export function pickTopNew(repos: TrendingRepo[], existingRepos: string[]): TrendingRepo | null {
  for (const repo of repos) {
    if (!existingRepos.includes(repo.name)) return repo;
  }
  return null;
}

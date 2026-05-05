export interface TrendingRepo {
  name: string;          // "owner/repo"
  description: string;
  language: string;
  stars: number;
  todayStars: number;
  url: string;
}

export interface HistoryRecord {
  date: string;
  repo: string;
  stars: number;
  language: string;
  todayStars: number;
  reportFile: string;
  tags: string[];
  summary: string;
}

export interface History {
  records: HistoryRecord[];
}

export interface CatalogEntry {
  repo: string;
  url: string;
  date: string;
  language: string;
  tags: string[];
  summary: string;
  reportFile: string;
}

export interface Catalog {
  entries: CatalogEntry[];
  byTag: Record<string, string[]>;       // tag -> repo names
  byLanguage: Record<string, string[]>;  // language -> repo names
}

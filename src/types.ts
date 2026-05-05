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
}

export interface History {
  records: HistoryRecord[];
}

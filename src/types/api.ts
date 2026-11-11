export interface GenreTag {
  term_id: number;
  name: string;
  slug: string;
  taxonomy?: string;
  count?: number;
  thumbnail?: string;
}

export interface Episode {
  chapter_id: string | number;
  chapter_name: string;
  chapter_content: string; // m3u8 stream manifest URL
  chapter_thumbnail?: string;
  thumbnail?: string;
  post_id?: string | number;
}

export interface HentaiItem {
  id?: string | number;
  post_ID?: string | number;
  post_title: string;
  post_title_alternative?: string;
  post_thumbnail?: string;
  thumbnail?: string;
  post_content?: string;
  post_views?: string | number;
  post_rate?: string | number;
  post_episodes_count?: string | number;
  post_date?: string;
  taxonomies?: GenreTag[];
  post_episodes?: Episode[];
  episodes?: Episode[];
}

export interface HomeData {
  trending_month?: HentaiItem[];
  last_episodes?: HentaiItem[];
  last?: HentaiItem[];
  uncensored?: HentaiItem[];
  ecchi?: HentaiItem[];
  tentacle?: HentaiItem[];
  incest?: HentaiItem[];
  yuri?: HentaiItem[];
}

export interface WatchHistoryItem {
  seriesId: string | number;
  seriesTitle: string;
  chapterId: string | number;
  chapterTitle: string;
  thumbnail: string;
  currentTime: number;
  duration: number;
  updatedAt: number;
}

export interface WatchlistItem {
  seriesId: string | number;
  title: string;
  thumbnail: string;
  episodesCount?: number;
  rating?: string | number;
  views?: string | number;
  addedAt: number;
}

export interface VideoQualityLevel {
  index: number;
  height: number;
  bitrate: number;
  label: string;
}

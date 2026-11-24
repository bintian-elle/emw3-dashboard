export const trendSources = ["tiktok", "instagram", "google"] as const;
export const trendMarkets = ["GB", "US", "DE", "NL", "FR", "CH", "ES", "IT"] as const;
export type TrendSource = typeof trendSources[number];
export type TrendItem = {
  id: string;
  source: TrendSource;
  kind: "video" | "ad" | "search";
  rank?: number;
  title: string;
  url: string;
  market: string | null;
  publishedAt: string | null;
  observedAt?: string;
  coverageHours: number;
  cover?: string;
  video?: string;
  mediaId?: string;
  durationSeconds?: number;
  hashtag?: string;
  metrics: { label: string; value: string }[];
  hook?: [string, string];
  takeaway?: [string, string];
  analysisBasis?: "cover" | "video";
  videoAnalysis?: {
    shots: [string, string];
    pacing: [string, string];
    captions: [string, string];
    sourceBreakdown?: {
      script: [string, string];
      storyboard: { time: string; visual: [string, string]; copy: [string, string] }[];
    };
  };
  searchAnalysis?: {
    connection: [string, string];
    scriptUse: [string, string];
  } | null;
  sellingPoints?: string[];
  series?: number[];
};

export type TrendFeed = {
  items: TrendItem[];
  instagramHours: number | null;
  updatedAt: string | null;
};

export const emptyTrendFeed: TrendFeed = { items: [], instagramHours: null, updatedAt: null };

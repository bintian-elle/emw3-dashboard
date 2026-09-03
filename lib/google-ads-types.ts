export type ComparisonMode = "POP" | "YOY";

export type DashboardMetric = {
  label: string;
  value: number | null;
  priorValue: number | null;
  delta: number | null;
  format: "currency" | "number" | "percent" | "ratio" | "compact";
  inverse?: boolean;
};

export type DashboardRow = {
  name: string;
  cost: number;
  revenue: number;
  roas: number | null;
  conversions: number;
  impressions: number;
  clicks: number;
  ctr: number | null;
  impressionShare?: number | null;
  delta?: number | null;
  absChange?: number | null;
};

export type BrandKeywordRow = DashboardRow & {
  isTotal: boolean;
  cvr: number | null;
  cpa: number | null;
  aov: number | null;
  deltas: Record<"cost"|"revenue"|"roas"|"conversions"|"impressions"|"clicks"|"ctr"|"cvr"|"cpa"|"aov", number|null>;
};

export type ProductRow = DashboardRow & {
  sku: string;
  brand: string | null;
  imageUrl: string | null;
};

export type GoogleAdsDashboardData = {
  customerId: string;
  latestDate: string;
  availableThrough: string;
  brandFilter: string;
  range: { start: string; end: string; days: number };
  comparison: { mode: ComparisonMode; start: string; end: string };
  metrics: DashboardMetric[];
  channels: DashboardRow[];
  searchTerms: DashboardRow[];
  brandKeywords: BrandKeywordRow[];
  products: ProductRow[];
  trend: Array<{ date: string; cost: number; revenue: number }>;
};

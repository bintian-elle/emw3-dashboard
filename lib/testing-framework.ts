export type TestingFrameworkKey = "overview" | "google-search" | "google-pmax" | "google-demand-gen" | "meta" | "reddit-awareness" | "reddit-conversion" | "social" | "edm";
export type TestingFramework = { goal: string; hypothesis: string; hypothesisBasis?: "documented" | "inferred" | "unavailable" };
export type ReadoutMetric = { label: string; value: string; detail?: string };

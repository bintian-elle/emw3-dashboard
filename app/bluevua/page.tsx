import { Suspense } from "react";
import BluevuaProject from "./brand-dashboard";
import { BrandMetric, type BrandMetricSource } from "./brand-metric";

const sources = ["google", "edm", "tracking", "testing"] as const;

export default function BluevuaPage() {
  const metric = (source: BrandMetricSource) => (
    <Suspense fallback={<p role="status">…</p>}>
      <BrandMetric source={source} />
    </Suspense>
  );
  return <BluevuaProject metrics={Object.fromEntries(sources.map(source => [
    `/bluevua/${source}`, metric(source),
  ]))} />;
}

"use client";

import {useSiteLanguage} from "@/components/application/dashboard/site-language-provider";
import {cx} from "@/utils/cx";
import type {MetricTrendSegment} from "./metric-trend-card";

export function MetricBreakdown({assets}:{assets:MetricTrendSegment[]}) {
  const {language}=useSiteLanguage();
  const chinese=language==="zh";
  return <div className="mt-3 border-t border-separator-border pt-3">
    <p className="text-caption-1-semibold text-text-tertiary">{chinese?"素材类型":"BY ASSET TYPE"}</p>
    <div className="mt-2 flex flex-wrap gap-2">
      {assets.map(item=><span key={item.label} className="inline-flex items-center gap-1.5 rounded-full bg-background-secondary-default px-3 py-1.5 text-caption-1-semibold text-text-secondary"><span className={cx("size-2 rounded-full",item.dot)}/>{item.label}<span className="text-text-primary">{item.display}</span></span>)}
    </div>
  </div>;
}

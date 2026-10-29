type ReportStat = { label: string; value: string; delta: string };

/** Compact metric cards shared by tracking report sections. */
export function ReportStats({ stats }: { stats: ReportStat[] }) {
  return <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {stats.map(stat => <section key={stat.label} className="min-w-0 rounded-[10px] border border-border-button-default bg-background-primary-default p-5">
      <p className="text-[13px] font-medium text-text-secondary">{stat.label}</p>
      <p className="mt-2 break-words text-[24px] font-semibold leading-tight tabular-nums tracking-tight text-text-primary">{stat.value}</p>
      <p className="mt-2 text-xs text-text-tertiary">{stat.delta}</p>
    </section>)}
  </div>;
}

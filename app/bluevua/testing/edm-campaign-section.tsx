import { RiMailLine } from "@remixicon/react";
import { EmailLightbox } from "@/components/application/media/email-lightbox";
import { Chip } from "@/components/base/badges/chip";
import type { EdmTestingData } from "@/lib/testing-edm";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat("en-US", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const date = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));

export function EdmCampaignSection({ data }: { data: EdmTestingData }) {
  return (
    <section className="mt-8 space-y-6">
      {data.campaigns.map((campaign) => (
        <article key={campaign.campaignId} className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default shadow-card">
          <div className="flex flex-col gap-4 border-b border-border-table p-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-status-yellow-background text-status-yellow-text">
                <RiMailLine className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 text-caption-1-semibold text-text-tertiary">
                  <span>EDM ·</span>
                  <Chip variant="caption" color="yellow">A/B TEST</Chip>
                  <span>CAMPAIGN</span>
                </div>
                <h2 className="mt-1 break-words text-title-2-semibold text-text-primary">{campaign.campaignName}</h2>
                <p className="mt-1 text-body-regular text-text-secondary">Second-module click-through comparison · {campaign.campaignStatus}</p>
              </div>
            </div>
            <p className="shrink-0 rounded-xl bg-background-secondary-default px-3 py-2 text-body-medium text-text-secondary">
              {data.periodLabel} · {date(data.period.start)} – {date(data.period.end)}
            </p>
          </div>
          <div>
            {campaign.tests.map((test) => (
              <div key={test.variationId} className="grid gap-5 border-b border-border-table p-5 last:border-0 hover:bg-background-primary-hover lg:grid-cols-[minmax(240px,1.7fr)_minmax(0,4fr)] lg:items-center">
                <div className="flex min-w-0 items-center gap-4">
                  <EmailLightbox html={test.html} title={`${test.label} · ${test.subject}`} />
                  <div className="min-w-0">
                    <p className="text-caption-1-semibold text-status-yellow-text">{test.label}</p>
                    <p className="mt-1 break-words text-body-medium text-text-primary">{test.fromLabel}</p>
                    <p className="mt-1 break-words text-body-2-regular text-text-secondary">{test.subject}</p>
                    {test.previewText && <p className="mt-1 break-words text-caption-2-regular text-text-tertiary">{test.previewText}</p>}
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
                  <Metric label="Module 2 CTR" value={test.secondModuleClickRate == null ? "—" : percent.format(test.secondModuleClickRate)} emphasized />
                  <Metric label="Open Rate" value={test.openRate == null ? "—" : percent.format(test.openRate)} />
                  <Metric label="Click Rate" value={test.clickRate == null ? "—" : percent.format(test.clickRate)} />
                  <Metric label="Orders" value={number.format(test.orders)} />
                  <Metric label="Total Revenue" value={currency.format(test.revenue)} />
                  <Metric label="Delivered" value={number.format(test.delivered)} />
                </dl>
              </div>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}

function Metric({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
  return <div><dt className={emphasized ? "text-caption-1-semibold text-status-yellow-text" : "text-caption-1-semibold text-text-tertiary"}>{label}</dt><dd className="mt-1 text-body-medium tabular-nums text-text-primary">{value}</dd></div>;
}

import {cx} from "@/utils/cx";

export function TestingDataLoading({compact=false}:{compact?:boolean}) {
  return <section role="status" aria-live="polite" aria-busy="true" className={cx("rounded-3xl border border-border-button-default bg-background-primary-default",compact?"p-3":"p-6")}><p className="text-headline-medium text-text-primary">Loading testing performance…</p><p className="mt-2 text-body-regular text-text-secondary">{compact?"Updating the selected reporting period. Please wait…":"Fetching reports from the connected channels. Reporting period selection will appear when loading finishes."}</p></section>;
}

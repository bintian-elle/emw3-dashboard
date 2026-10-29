import { LoaderCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function ReportLoading() {
  return <section aria-busy="true" aria-live="polite" role="status" className="space-y-4">
    <p className="flex items-center justify-center gap-2 text-[13px] text-text-secondary"><LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none"/>Loading data…</p>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-hidden="true">
      {[0,1,2,3].map(item => <div key={item} className="space-y-3 rounded-[10px] border border-border-button-default bg-background-primary-default p-5"><Skeleton className="h-3 w-24"/><Skeleton className="h-7 w-28"/><Skeleton className="h-3 w-16"/></div>)}
    </div>
  </section>;
}

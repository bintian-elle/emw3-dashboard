"use client";

import {Button} from "@/components/base/buttons/button";

export default function RedditTestingError({reset}:{reset:()=>void}) {
 return <section role="alert" className="rounded-3xl border border-border-button-default bg-background-primary-default p-6"><h2 className="text-headline-medium text-text-primary">Reddit reports could not be loaded</h2><p className="mt-2 text-body-regular text-text-secondary">Reddit may be temporarily unavailable. Please retry before selecting another reporting period.</p><Button variant="secondary" className="mt-4" onClick={reset}>Retry loading reports</Button></section>;
}

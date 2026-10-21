import {TestingAskButton} from "../testing-ai";
import Link from "next/link";
import {RiInstagramLine} from "@remixicon/react";
import {getSocialPerformance} from "@/lib/testing-social";
import {SocialPostTable} from "./social-post-table";
import {TestReadout} from "../test-readout";
export default async function SocialPerformancePage(){
 const data=await getSocialPerformance();
 return <><header className="mb-6"><div className="float-right"><TestingAskButton/></div><Link href="/bluevua/testing" className="text-body-medium text-text-secondary hover:text-text-primary">Bluevua · Testing</Link><div className="mt-2 flex items-center gap-3"><RiInstagramLine className="size-7 text-foreground-icon-primary" aria-hidden/><h1 className="text-title-1-semibold text-text-primary">Social Media Performance</h1></div><p className="mt-2 text-body-regular text-text-secondary">Instagram · @bluevua · 10 selected posts for the September review</p><p className="mt-2 text-caption-1-regular text-text-tertiary">Lifetime post metrics</p></header>{data.error&&<p role="status" className="mb-4 rounded-xl bg-background-tertiary-default p-4 text-body-regular text-text-secondary">{data.stale?"Instagram refresh is unavailable. Showing the last saved results.":"Instagram data is temporarily unavailable. Post links remain available."}</p>}<TestReadout standalone channel="social" testIdentity="social-selected-posts" period={{label:"Lifetime snapshot",start:"",end:""}}><section aria-label="Selected Instagram posts" className="min-w-0 overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default p-4"><SocialPostTable posts={data.posts}/></section><p className="mt-4 text-caption-1-regular text-text-secondary">Dates show actual publication dates in UTC. The selected set includes an October 1 post. “—” means unavailable; Requests for these Reels returned #100: The Media Insights API does not support the follows metric for this media product type.</p></TestReadout></>;
}

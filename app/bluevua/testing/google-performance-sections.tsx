import {withTestingReturnTo} from "@/lib/testing-navigation";
import type {getGoogleTestingPerformance} from "@/lib/google-testing-performance";
import {GoogleTestSection} from "./google-test-section";

type Performance=Awaited<ReturnType<typeof getGoogleTestingPerformance>>;
export function GooglePerformanceSections({data,returnTo}:{data:Performance;returnTo:string}) {
 return <div className="grid gap-6">{data.activeCards.map(test=><GoogleTestSection key={test.campaignName} test={test} creativeLinks={Object.fromEntries(test.groups.map(group=>[group.adGroupId,withTestingReturnTo(`/bluevua/testing/google/search/${group.adGroupId}`,returnTo)]))} compact description="Content testing · All ad groups"/>)}{data.concluded.map(({definition,report,concludedOn})=><GoogleTestSection key={definition.id} compact test={report} creativeLinks={Object.fromEntries(report.groups.map(group=>[group.adGroupId,withTestingReturnTo(`/bluevua/testing/google/concluded/${definition.id}/${group.label==="Group A"?"treatment":"control"}`,returnTo)]))} description={definition.name} concludedOn={concludedOn} resourcesHref={definition.resourcesHref}/>)}</div>;
}

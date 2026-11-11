'use client';

import {usePathname,useSearchParams} from 'next/navigation';
import {resolveTestingPeriod,testingLatestCompleteDate} from '@/lib/testing-period';
import {InventorySkeleton} from './inventory/inventory-page';
import {NovaPreviewHeader} from './nova-preview-shell';
import {OverviewLoadingContent} from './overview-loading';
import {ChannelRouteLoading} from './channel-route-loading';
import {TestingWorkspaceTabs} from './testing-workspace-tabs';

export function TestingRouteLoading(){
 const path=usePathname(),params=useSearchParams();
 if(path==='/bluevua/testing/inventory'||path==='/bluevua/testing'){
  const preset=params.get('period')??'lastWeek';
  const period=resolveTestingPeriod(testingLatestCompleteDate(),{preset:preset as 'lastWeek',start:params.get('start')??undefined,end:params.get('end')??undefined});
  return path==='/bluevua/testing/inventory'?<><NovaPreviewHeader sharePeriod={period}/><InventorySkeleton/></>:<><NovaPreviewHeader sharePeriod={period}/><TestingWorkspaceTabs active="overview"/><OverviewLoadingContent/></>;
 }
 const names:Record<string,string>={'google/search':'Google Search Testing Performance','google/pmax':'Google PMAX Testing Performance','google/demand-gen':'Google Demand Gen Testing Performance',meta:'Meta Testing Performance',reddit:'Reddit Testing Performance',edm:'EDM Testing Performance',social:'Social Media Performance',concluded:'Concluded Test',prompts:'Prompts'};
 const route=path.replace(/^\/bluevua\/testing\/?/,'');
 const name=Object.entries(names).find(([key])=>route===key||route.startsWith(`${key}/`))?.[1]??'Content testing';
 return <ChannelRouteLoading title={name}/>;
}

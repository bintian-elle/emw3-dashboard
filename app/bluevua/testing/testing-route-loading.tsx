'use client';

import {usePathname,useSearchParams} from 'next/navigation';
import {configuredTestingCampaignCount} from '@/lib/testing-campaign-counts';
import {resolveTestingPeriod,testingLatestCompleteDate} from '@/lib/testing-period';
import {InventorySkeleton} from './inventory/inventory-page';
import {NovaPreviewHeader} from './nova-preview-shell';
import {OverviewLoadingContent} from './overview-loading';
import {TestingDataLoading} from './testing-data-loading';
import {TestingWorkspaceTabs} from './testing-workspace-tabs';

export function TestingRouteLoading(){
 const path=usePathname(),params=useSearchParams();
 if(path==='/bluevua/testing/inventory'||path==='/bluevua/testing'){
  const preset=params.get('period')??'lastWeek';
  const period=resolveTestingPeriod(testingLatestCompleteDate(),{preset:preset as 'lastWeek',start:params.get('start')??undefined,end:params.get('end')??undefined});
  return path==='/bluevua/testing/inventory'?<><NovaPreviewHeader sharePeriod={period}/><InventorySkeleton/></>:<><NovaPreviewHeader sharePeriod={period}/><TestingWorkspaceTabs active="overview" count={configuredTestingCampaignCount()}/><OverviewLoadingContent/></>;
 }
 return <TestingDataLoading/>;
}

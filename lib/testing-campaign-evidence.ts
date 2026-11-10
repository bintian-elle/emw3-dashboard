import type {TestingReportRange} from './testing-report-scope.ts';

type Campaign={name?:string;campaignName?:string};
export function selectCampaignEvidence<T extends Campaign>(data:{period:TestingReportRange;campaigns:T[]},name:string){
 const campaigns=data.campaigns.filter(c=>(c.campaignName??c.name)===name);
 if(campaigns.length!==1)throw Error('Campaign data unavailable or ambiguous');
 return {period:data.period,campaigns};
}

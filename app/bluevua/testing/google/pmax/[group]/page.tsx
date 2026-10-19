import {GoogleTestingAssetPage} from "../../../google-testing-asset-page";
type SearchParams={period?:string;start?:string;end?:string;returnTo?:string};
export default function PmaxAssetGroupPage({params,searchParams}:{params:Promise<{group:string}>;searchParams:Promise<SearchParams>}){
 return <GoogleTestingAssetPage channel="pmax" params={params} searchParams={searchParams}/>;
}

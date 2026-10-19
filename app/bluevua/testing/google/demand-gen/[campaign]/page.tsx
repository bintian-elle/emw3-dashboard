import {GoogleTestingAssetPage} from "../../../google-testing-asset-page";
type SearchParams={period?:string;start?:string;end?:string;returnTo?:string};
export default async function DemandGenAdAssetsPage({params,searchParams}:{params:Promise<{campaign:string}>;searchParams:Promise<SearchParams>}){
 const {campaign:ad}=await params;
 return <GoogleTestingAssetPage channel="demand-gen" params={Promise.resolve({group:ad})} searchParams={searchParams}/>;
}

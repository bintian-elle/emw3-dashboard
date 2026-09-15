import { NextResponse } from "next/server";
import { KlaviyoError, loadDashboard, type DashboardRequest } from "@/lib/klaviyo-dashboard";

function valid(range:DashboardRequest["range"]){const start=Date.parse(`${range?.start}T00:00:00Z`),end=Date.parse(`${range?.end}T00:00:00Z`);return Number.isFinite(start)&&Number.isFinite(end)&&end>=start&&(end-start)/86_400_000<365;}
export async function POST(request:Request){try{const input=await request.json() as DashboardRequest;if(!valid(input.range)||!valid(input.comparison))return NextResponse.json({error:"Select a valid date range of no more than 365 days."},{status:400});return NextResponse.json(await loadDashboard(input));}catch(error){const status=error instanceof KlaviyoError&&error.retryAfter?429:500;return NextResponse.json({error:error instanceof Error?error.message:"Klaviyo data could not be loaded.",retryAfter:error instanceof KlaviyoError?error.retryAfter:0},{status});}}

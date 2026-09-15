import { NextResponse } from "next/server";
import { creativePerformance, type DateRange } from "@/lib/klaviyo-dashboard";

export async function POST(request:Request){try{const {range}=await request.json() as {range:DateRange};return NextResponse.json(await creativePerformance(range));}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Creative performance could not be loaded."},{status:500});}}

import { NextResponse } from "next/server";
import { campaignPreview } from "@/lib/klaviyo-dashboard";

export async function POST(request:Request){const {campaigns}=await request.json() as {campaigns:Array<{messageId:string;channel:"email"|"sms"}>};const visible=(campaigns||[]).slice(0,20);const pairs=await Promise.all(visible.map(async item=>[item.messageId,await campaignPreview(item.messageId,item.channel)] as const));return NextResponse.json({previews:Object.fromEntries(pairs)});}

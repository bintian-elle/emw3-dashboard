import type { RedditTestingData } from "./testing-reddit.ts";
import type { OverviewDailySource } from "./overview-daily-metrics.ts";

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const finite = (value: unknown) => typeof value === "number" && Number.isFinite(value);
const nullableNumber = (value: unknown) => value === null || finite(value);
const nullableString = (value: unknown) => value === null || typeof value === "string";
const metrics = (value: Record<string, unknown>) => ["spend", "impressions", "clicks", "reach", "orders", "revenue"].every(key => finite(value[key])) && ["ctr", "cpm", "costPerThousandReach", "cpa", "cvr", "roas", "cpc"].every(key => nullableNumber(value[key]));

/** A cached report must match the requested reporting period and the render contract. */
export function validRedditTestingSnapshot(value: unknown, period: {start:string;end:string}, label: string): value is RedditTestingData {
 if (!record(value) || !record(value.period) || value.period.start !== period.start || value.period.end !== period.end || value.periodLabel !== label || !Array.isArray(value.campaigns)) return false;
 return value.campaigns.every(campaign => record(campaign) && typeof campaign.campaignId === "string" && typeof campaign.name === "string" && (campaign.kind === "Awareness" || campaign.kind === "Conversion") && (campaign.campaignStatus === undefined || typeof campaign.campaignStatus === "string") && metrics(campaign) && Array.isArray(campaign.groups) && campaign.groups.every(group => record(group) && typeof group.adGroupId === "string" && typeof group.name === "string" && metrics(group) && Array.isArray(group.activeAds) && group.activeAds.every(ad => record(ad) && typeof ad.adId === "string" && typeof ad.name === "string" && (ad.contentType === "Image" || ad.contentType === "Video" || ad.contentType === "Message") && [ad.headline,ad.body,ad.thumbnailUrl,ad.videoUrl,ad.postUrl].every(nullableString) && metrics(ad))));
}

/** Totals and daily trends must be published together for the same period. */
export function validRedditSharedSnapshot(value: unknown, period: {start:string;end:string}, label: string): value is {data:RedditTestingData;daily:OverviewDailySource} {
 if(!record(value) || !validRedditTestingSnapshot(value.data,period,label) || !record(value.daily) || value.daily.channel!=="Reddit" || !Array.isArray(value.daily.rows) || !Array.isArray(value.daily.reach)) return false;
 const dateInPeriod=(date:unknown)=>typeof date==="string" && /^\d{4}-\d{2}-\d{2}$/.test(date) && date>=period.start && date<=period.end;
 return value.daily.rows.every(row=>record(row) && dateInPeriod(row.date) && typeof row.entityId==="string" && (row.assetType==="Picture"||row.assetType==="Video"||row.assetType==="Message") && ["spend","revenue","orders","clicks"].every(key=>finite(row[key])) && nullableNumber(row.impressions)) && value.daily.reach.every(row=>record(row) && dateInPeriod(row.date) && nullableNumber(row.value));
}

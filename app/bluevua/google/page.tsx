import { GoogleAdsDashboard } from "./google-ads-dashboard";
import { getGoogleAdsDashboard } from "@/lib/google-ads";
import { connection } from "next/server";

export default async function GoogleAdsPage() {
  await connection();
  const initialData = await getGoogleAdsDashboard();
  return <GoogleAdsDashboard initialData={initialData} />;
}

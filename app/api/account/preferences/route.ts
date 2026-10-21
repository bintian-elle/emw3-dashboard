import { NextResponse } from "next/server";
import { currentSiteUser } from "@/lib/current-site-user";
import { isSiteLanguage } from "@/lib/site-language";
import { saveUserLanguage } from "@/lib/site-user-preferences";
export async function PATCH(request: Request) {
  const user = await currentSiteUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!isSiteLanguage(body?.language)) return NextResponse.json({ error: "Invalid language" }, { status: 400 });
  try {
    await saveUserLanguage(user.sub, body.language);
    return NextResponse.json({ language: body.language }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "Unable to save language preference." }, { status: 503 }); }
}

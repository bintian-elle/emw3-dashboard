import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Access key login has been replaced by Google sign-in." }, { status: 410 });
}

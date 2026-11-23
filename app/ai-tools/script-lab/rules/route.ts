import type { NextRequest } from "next/server";
import { getRules, mutateRules } from "@/lib/script-lab-rules-route";

export function GET(request: NextRequest) { return getRules(request, "internal"); }
export function POST(request: NextRequest) { return mutateRules(request, "internal"); }
export function PATCH(request: NextRequest) { return mutateRules(request, "internal"); }
export function DELETE(request: NextRequest) { return mutateRules(request, "internal"); }

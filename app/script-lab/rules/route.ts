import type { NextRequest } from "next/server";
import { getRules, mutateRules } from "@/lib/script-lab-rules-route";

export function GET(request: NextRequest) { return getRules(request, "customer"); }
export function POST(request: NextRequest) { return mutateRules(request, "customer"); }
export function PATCH(request: NextRequest) { return mutateRules(request, "customer"); }
export function DELETE(request: NextRequest) { return mutateRules(request, "customer"); }

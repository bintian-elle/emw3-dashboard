import type { NextRequest } from "next/server";
import { getBaselines } from "@/lib/script-lab-baselines-route";

export function GET(request: NextRequest) { return getBaselines(request, "internal"); }

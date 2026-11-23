import type { NextRequest } from "next/server";
import { prepareVideoRequest, readVideoRequest } from "@/lib/script-lab-video-request-route";

export function POST(request: NextRequest) { return prepareVideoRequest(request, "public"); }

export function GET(request: NextRequest) { return readVideoRequest(request, "public"); }

import type { NextRequest } from "next/server";
import { getReviews, postReview } from "@/lib/script-lab-review-route";

export function GET(request: NextRequest) { return getReviews(request, "internal"); }
export function POST(request: NextRequest) { return postReview(request, "internal"); }

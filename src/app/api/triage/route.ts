import { NextRequest, NextResponse } from "next/server";
import { runInvestigationPipeline } from "@/lib/investigationEngine";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json().catch(() => null);

    if (!payload || !payload.title?.trim() || !payload.description?.trim()) {
      return NextResponse.json(
        { error: "Both title and description are required for investigation." },
        { status: 400 }
      );
    }

    const result = await runInvestigationPipeline(payload);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Triage Route Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error during investigation" },
      { status: 500 }
    );
  }
}

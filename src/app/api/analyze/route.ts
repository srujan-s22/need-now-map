import { NextResponse } from "next/server";
import { runInvestigationPipeline } from "@/lib/investigationEngine";

export async function POST(req: Request) {
  try {
    const payload = await req.json().catch(() => null);
    
    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    if (!payload.title?.trim() || !payload.description?.trim()) {
      return NextResponse.json(
        { error: "Both title and description are required for triage analysis." },
        { status: 400 }
      );
    }

    const triageResult = await runInvestigationPipeline(payload);
    return NextResponse.json(triageResult, { status: 200 });
  } catch (error) {
    console.error("API Analysis Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error during AI Analysis" },
      { status: 500 }
    );
  }
}

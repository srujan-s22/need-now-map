import { NextResponse } from "next/server";
import { triageIncident } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    
    // Server-side validation could go here
    if (!payload.title || !payload.description) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const triageResult = await triageIncident(payload);
    
    return NextResponse.json(triageResult, { status: 200 });
  } catch (error) {
    console.error("API Analysis Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error during AI Analysis" },
      { status: 500 }
    );
  }
}

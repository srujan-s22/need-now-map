import { NextRequest } from "next/server";
import { runInvestigationPipeline } from "@/lib/investigationEngine";
import { InvestigationStreamEvent } from "@/types/investigation";

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  const payload = await req.json().catch(() => null);

  if (!payload || !payload.title?.trim() || !payload.description?.trim()) {
    return new Response(
      JSON.stringify({ error: "Both title and description are required for investigation." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const customStream = new ReadableStream({
    async start(controller) {
      const sendEvent = (eventData: InvestigationStreamEvent) => {
        try {
          const chunk = `data: ${JSON.stringify(eventData)}\n\n`;
          controller.enqueue(encoder.encode(chunk));
        } catch (err) {
          console.warn("Error encoding SSE chunk:", err);
        }
      };

      try {
        await runInvestigationPipeline(payload, sendEvent);
      } catch (error: unknown) {
        console.error("Investigation stream execution error:", error);
        sendEvent({
          event: "investigation_error",
          message: error instanceof Error ? error.message : "Investigation pipeline failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(customStream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

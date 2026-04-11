import { NextResponse } from "next/server";
import { getStaticCoaching } from "@/lib/coach/static-coach";
import type { GuidedPhase } from "@/lib/store";

export const runtime = "edge";

interface CoachRequest {
  caseId: string;
  phase: GuidedPhase;
}

/**
 * AI Coach Edge route.
 *
 * AC7 (graceful degrade): any error during the Anthropic call returns the
 * static coach copy as a clean JSON fallback. The client can't tell the
 * difference; the UX is preserved.
 *
 * Also: the request body NEVER carries learner freeform text (R9 / PIPA).
 * Only the (caseId, phase) pair is accepted — same context the static coach uses.
 */
export async function POST(req: Request): Promise<Response> {
  let body: CoachRequest;
  try {
    body = (await req.json()) as CoachRequest;
  } catch {
    return NextResponse.json({ text: "" }, { status: 400 });
  }

  const fallback = getStaticCoaching({ caseId: body.caseId, phase: body.phase });

  if (process.env.NEXT_PUBLIC_AI_COACH_ENABLED !== "true" || !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ text: fallback, source: "static" });
  }

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system:
        "당신은 개발원가 교육 코치입니다. 간결하고 격려하는 톤으로, 정답을 직접 말하지 않고 사고 과정을 유도합니다. 한국어로 답변하세요.",
      messages: [
        {
          role: "user",
          content: `케이스: ${body.caseId}, 단계: ${body.phase}. 학습자가 이 단계의 메커니즘을 더 잘 이해하도록 짧은 힌트를 주세요. 정적 카피: ${fallback}`
        }
      ]
    });
    const text =
      msg.content?.[0]?.type === "text" ? msg.content[0].text : fallback;
    return NextResponse.json({ text, source: "ai" });
  } catch {
    return NextResponse.json({ text: fallback, source: "static-fallback" });
  }
}

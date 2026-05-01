import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { CASES } from "@/lib/cases";
import { buildSystemPrompt } from "@/lib/coach/system-prompt";

import p1 from "@/content/problems/p1-loading.json";
import p4 from "@/content/problems/p4-material-yield.json";
import p5 from "@/content/problems/p5-cuts-mask.json";
import p6 from "@/content/problems/p6-tact-investment.json";
import type { ProblemDef } from "@/content/problems/types";

export const runtime = "edge";

const PROBLEMS: Record<string, ProblemDef> = {
  "01-loading": p1 as unknown as ProblemDef,
  "04-material-yield": p4 as unknown as ProblemDef,
  "05-cuts-mask": p5 as unknown as ProblemDef,
  "06-tact-investment": p6 as unknown as ProblemDef
};

const RequestSchema = z.object({
  problemId: z.string(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000)
      })
    )
    .min(1)
    .max(40),
  answers: z.record(z.record(z.number())),
  lastGrade: z
    .object({
      score: z.number().nullable(),
      total: z.number(),
      correctCells: z.array(z.string()),
      incorrectCells: z.array(z.string())
    })
    .nullable()
});

const MODEL = "gemini-2.5-flash";

function pickMockReply(userText: string): string {
  const t = userText.toLowerCase();
  if (/노무비|labor/.test(t)) {
    return "노무비를 한 번 거꾸로 따라가볼까요?\n\n• Loading이 줄어들면 같은 노무비를 더 적은 단위에 분담시켜야 해요. 분담의 분모는 무엇일까요?\n\n(MOCK 응답 — 실제 코치는 GEMINI_API_KEY가 설정되면 활성화됩니다)";
  }
  if (/수율|yield/.test(t)) {
    return "수율을 잘 짚으셨네요. 수율이 1% 떨어지면 같은 산출물을 만들기 위해 무엇이 더 필요할까요?\n\n• 단위당 BOM은 어떻게 변할까요?\n\n(MOCK)";
  }
  if (/모르|어렵|힌트/.test(t)) {
    return "괜찮습니다. 한 단계 작게 가볼게요.\n\n• 이 문제에서 가장 먼저 변하는 변수는 무엇인가요? 그 변수가 어떤 셀에 직접 영향을 줄까요?\n\n(MOCK)";
  }
  return "좋은 출발이에요. 그 가설을 어떻게 확인할 수 있을까요?\n\n• 어떤 셀의 값을 비교하면 알 수 있을까요?\n• 비례인지 반비례인지 먼저 따져볼까요?\n\n(MOCK 응답입니다)";
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  const mockMode = !apiKey;

  let body: z.infer<typeof RequestSchema>;
  try {
    const json = await req.json();
    body = RequestSchema.parse(json);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid request";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const problem = PROBLEMS[body.problemId];
  const caseDef = CASES[body.problemId];
  if (!problem || !caseDef) {
    return new Response(JSON.stringify({ error: "Unknown problemId" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }

  const systemPrompt = buildSystemPrompt({
    problem,
    caseDef,
    answers: body.answers,
    lastGrade: body.lastGrade
  });

  // Drop any leading messages before the first user turn (Gemini requires user-first)
  const firstUserIdx = body.messages.findIndex((m) => m.role === "user");
  const trimmed =
    firstUserIdx === -1 ? body.messages : body.messages.slice(firstUserIdx);

  if (trimmed.length === 0 || trimmed[trimmed.length - 1].role !== "user") {
    return new Response(
      JSON.stringify({ error: "Last message must be from user" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const lastUserText = trimmed[trimmed.length - 1].content;

  // Convert to Gemini contents format
  const contents = trimmed.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }]
  }));

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(payload: object) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
        );
      }

      try {
        if (mockMode) {
          const reply = pickMockReply(lastUserText);
          for (let i = 0; i < reply.length; i += 3) {
            await new Promise((r) => setTimeout(r, 18));
            send({ type: "text", text: reply.slice(i, i + 3) });
          }
        } else {
          const ai = new GoogleGenAI({ apiKey });
          const response = await ai.models.generateContentStream({
            model: MODEL,
            contents,
            config: {
              systemInstruction: systemPrompt,
              temperature: 0.6,
              maxOutputTokens: 600
            }
          });

          for await (const chunk of response) {
            const text = chunk.text;
            if (text) send({ type: "text", text });
          }
        }

        send({ type: "done" });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown error";
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}

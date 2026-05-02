import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { CASES } from "@/lib/cases";
import {
  buildSystemPrompt,
  buildSandboxSystemPrompt
} from "@/lib/coach/system-prompt";

import p1 from "@/content/problems/p1-loading.json";
import p4 from "@/content/problems/p4-material-yield.json";
import p5 from "@/content/problems/p5-cuts-mask.json";
import p6 from "@/content/problems/p6-tact-investment.json";
import type { ProblemDef } from "@/content/problems/types";

export const runtime = "nodejs";

const PROBLEMS: Record<string, ProblemDef> = {
  "01-loading": p1 as unknown as ProblemDef,
  "04-material-yield": p4 as unknown as ProblemDef,
  "05-cuts-mask": p5 as unknown as ProblemDef,
  "06-tact-investment": p6 as unknown as ProblemDef
};

const ProcessingItemSchema = z.object({
  labor: z.number(),
  expense: z.number(),
  depreciation: z.number()
});

const SandboxStateSchema = z.object({
  params: z.object({
    price: z.number(),
    loading: z.number(),
    yields: z.object({
      tft: z.number(),
      cf: z.number(),
      cell: z.number(),
      module: z.number()
    }),
    bom: z.object({
      tft: z.number(),
      cf: z.number(),
      cell: z.number(),
      module: z.number()
    }),
    processing: z.object({
      panel: ProcessingItemSchema,
      module: ProcessingItemSchema
    }),
    sga: z.object({
      direct_dev: z.number(),
      transport: z.number(),
      business_unit: z.number(),
      operation: z.number(),
      corporate_oh: z.number()
    })
  }),
  result: z.record(z.number()),
  lastDelta: z.array(
    z.object({
      path: z.string(),
      before: z.number(),
      after: z.number()
    })
  )
});

const RequestSchema = z.object({
  problemId: z.string(),
  mode: z.enum(["worksheet", "sandbox"]).optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000)
      })
    )
    .min(1)
    .max(40),
  answers: z.record(z.record(z.number())).optional(),
  lastGrade: z
    .object({
      score: z.number().nullable(),
      total: z.number(),
      correctCells: z.array(z.string()),
      incorrectCells: z.array(z.string())
    })
    .nullable()
    .optional(),
  sandbox: SandboxStateSchema.optional()
});

const MODEL = "gemini-2.5-flash";

function pickMockReply(userText: string, mode: "worksheet" | "sandbox"): string {
  const t = userText.toLowerCase();
  if (mode === "sandbox") {
    if (/loading|가동률/.test(t)) {
      return "좋은 질문이에요. Loading 슬라이더를 움직이면 트리의 어떤 노드가 가장 먼저 흔들리는지 한 번 직접 확인해 볼까요?\n\n• 노무비/경비/상각 중 어디가 더 크게 변하나요? 그 차이가 의미하는 게 뭘까요?\n\n(MOCK 응답 — GEMINI_API_KEY가 설정되면 실제 코치가 활성화됩니다)";
    }
    if (/수율|yield/.test(t)) {
      return "수율을 잘 짚으셨네요. TFT 수율을 1%만 떨어뜨려 보고, 소요재료비가 얼마나 변하는지 보세요.\n\n• 누적 수율의 분모가 뭔지 떠올리면 그 변화의 크기가 자연스럽게 설명됩니다.\n\n(MOCK)";
    }
    if (/모르|어렵|힌트/.test(t)) {
      return "괜찮습니다. 한 단계 작게 가볼게요.\n\n• 지금 화면에서 가장 큰 노드 하나를 골라 보세요. 그 노드는 어떤 두 가지로 쪼개지나요?\n\n(MOCK)";
    }
    return "좋은 출발이에요. 그 가설을 확인하려면 어떤 슬라이더를 어떻게 움직여 보면 될까요?\n\n• 변화 전/후 트리의 어떤 노드 값을 비교하면 답이 보일까요?\n\n(MOCK 응답입니다)";
  }
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

  const mode = body.mode ?? "worksheet";
  const caseDef = CASES[body.problemId];
  if (!caseDef) {
    return new Response(JSON.stringify({ error: "Unknown problemId" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }

  let systemPrompt: string;
  if (mode === "sandbox") {
    if (!body.sandbox) {
      return new Response(
        JSON.stringify({ error: "sandbox state required for sandbox mode" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    systemPrompt = buildSandboxSystemPrompt({
      caseDef,
      // Zod schema validates structurally; cast for the typed CostParams/CostResult.
      sandbox: body.sandbox as unknown as Parameters<typeof buildSandboxSystemPrompt>[0]["sandbox"]
    });
  } else {
    const problem = PROBLEMS[body.problemId];
    if (!problem) {
      return new Response(JSON.stringify({ error: "Unknown problemId" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    systemPrompt = buildSystemPrompt({
      problem,
      caseDef,
      answers: body.answers ?? {},
      lastGrade: body.lastGrade ?? null
    });
  }

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
          const reply = pickMockReply(lastUserText, mode);
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

// src/app/api/ai/tests/route.ts
import { GoogleGenAI } from "@google/genai";
import {
  extractModelText,
  isTestsResponse,
  parseModelJson,
} from "@/lib/ai-validation";
import {
  createAiErrorResponse,
  hasMaxTokensFinishReason,
} from "@/lib/ai-error-classification";

export const runtime = "edge";

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: "Missing GEMINI_API_KEY" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.json();

  const prompt = `
あなたは優秀なQAエンジニアです。

以下の要件からテストケースを作成してください。
acceptanceCriteriaを必ず分解してください。

正常系、異常系、エッジケースを網羅的に生成してください。

要件:
${JSON.stringify(body, null, 2)}

以下の形式でJSONのみ出力：
{
  "tests": [
    {
      "feature": "機能名",
      "cases": [
        {
          "title": "テストケース名",
          "precondition": "前提条件",
          "steps": "実行手順",
          "expected": "期待値",
          "type": "normal | edge | error"
        }
      ]
    }
  ]
}
`;

  let res: unknown;

  try {
    res = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });
  } catch (error) {
    return createAiErrorResponse(error);
  }

  const textOutput = extractModelText(res);
  const reachedTokenLimit = hasMaxTokensFinishReason(res);

  try {
    const json = parseModelJson(textOutput);

    if (reachedTokenLimit) {
      return new Response(JSON.stringify({ error: "AI_TOKEN_LIMIT" }), {
        status: 413,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!isTestsResponse(json)) {
      return new Response(JSON.stringify({ error: "Invalid tests response" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(json), { headers: { "Content-Type": "application/json" } });
  } catch {
    return new Response(
      JSON.stringify({
        error: reachedTokenLimit ? "AI_TOKEN_LIMIT" : "JSON parse error",
        raw: textOutput,
      }),
      {
        status: reachedTokenLimit ? 413 : 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

// src/app/api/ai/requirements/route.ts
import { GoogleGenAI } from "@google/genai";
import {
  extractModelText,
  isRequirementsResponse,
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
あなたは優秀なシステムエンジニアです。
以下の要件を構造化してください。

プロジェクト名: ${body.title}
説明: ${body.description}

以下の形式でJSONのみで出力してください：
{
  "requirements": [
    {
      "feature": "機能名",
      "description": "説明",
      "acceptanceCriteria": ["条件1", "条件2"]
    }
  ]
}
`;

  let res: unknown;

  try {
    // Gemini Developer API: use models.generateContent and read response.text
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

    if (!isRequirementsResponse(json)) {
      return new Response(JSON.stringify({ error: "Invalid requirements response" }), {
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

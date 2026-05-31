// src/app/api/ai/tests/route.ts
import { GoogleGenAI } from "@google/genai";

export const runtime = "edge";

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
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

  const res: unknown = await client.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
  });

  const extractText = (r: unknown): string => {
    if (r && typeof r === "object") {
      const ro = r as Record<string, unknown>;
      if (typeof ro.text === "string") return ro.text;
      if (ro.response && typeof ro.response === "object") {
        const rr = ro.response as Record<string, unknown>;
        if (typeof rr.text === "string") return rr.text;
      }
      if (typeof ro.output_text === "string") return ro.output_text;
      if (typeof ro.body === "string") return ro.body;
      return JSON.stringify(r);
    }
    return String(r);
  };

  const textOutput = extractText(res);

  try {
    const json = JSON.parse(String(textOutput));
    return new Response(JSON.stringify(json), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: "JSON parse error", raw: textOutput }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

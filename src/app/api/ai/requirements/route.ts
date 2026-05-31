// src/app/api/ai/requirements/route.ts
import { GoogleGenAI } from "@google/genai";

export const runtime = "edge";

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
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

  // Gemini Developer API: use models.generateContent and read response.text
  const res: unknown = await client.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
  });

  // SDK may expose the generated text as `text` or `response.text` depending on version
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

// src/app/api/ai/tests/route.ts
import OpenAI from "openai";

export const runtime = "edge";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  const body = await req.json();

  const prompt = `
あなたは優秀なQAエンジニアです。

以下の要件からテストケースを作成してください。
acceptanceCriteriaを必ず分解してください。

出力は必ずJSONのみ。

形式：
{
  "tests": [
    {
      "feature": "機能名",
      "cases": [
        {
          "title": "",
          "precondition": "",
          "steps": "",
          "expected": "",
          "type": "normal | edge | error"
        }
      ]
    }
  ]
}

要件:
${JSON.stringify(body)}
`;

  const res = await client.responses.create({
    model: "gpt-5.5",
    input: prompt,
    text: {
      format: {
        type: "json_object" // ← ここが重要（MVP最適）
      }
    }
  });

  try {
    const json = JSON.parse(res.output_text);
    return Response.json(json);
  } catch (e) {
    e;
    return Response.json(
      {
        error: "JSON parse error",
        raw: res.output_text
      },
      { status: 500 }
    );
  }
}
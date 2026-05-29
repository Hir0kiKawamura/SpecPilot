// src/app/api/ai/requirements/route.ts
import OpenAI from "openai";

export const runtime = "edge";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  const body = await req.json();

  const prompt = `
あなたは優秀なシステムエンジニアです。
以下の要件を構造化してください。

必ずJSONのみで出力してください。

${JSON.stringify(body)}
`;

  const res = await client.responses.create({
    model: "gpt-5.5",
    input: prompt,
    text: {
      format: {
        type: "json_schema",
        name: "requirements_schema",
        schema: {
          type: "object",
          properties: {
            requirements: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  feature: { type: "string" },
                  description: { type: "string" },
                  acceptanceCriteria: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: ["feature", "description", "acceptanceCriteria"],
              },
            },
          },
          required: ["requirements"],
        },
      },
    },
  });

  return new Response(res.output_text, {
    headers: { "Content-Type": "application/json" },
  });
}

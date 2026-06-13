const errorMessages: Record<string, string> = {
  "Missing GEMINI_API_KEY":
    "Gemini APIキーが設定されていません。.env.localを確認してください。",
  "Invalid requirements response":
    "AIの要件整理結果が想定形式ではありませんでした。入力内容を調整して再実行してください。",
  "Invalid tests response":
    "AIのテストケース生成結果が想定形式ではありませんでした。もう一度お試しください。",
  "JSON parse error":
    "AIの応答をJSONとして読み取れませんでした。もう一度お試しください。",
  AI_TOKEN_LIMIT:
    "AIのトークン上限に達した可能性があります。入力内容や要件数を減らしてから再実行してください。",
  AI_PROVIDER_ERROR:
    "AIサービスでエラーが発生しました。時間をおいてもう一度お試しください。",
};

export const getClientErrorMessage = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  try {
    const body = (await response.json()) as unknown;

    if (body && typeof body === "object") {
      const record = body as Record<string, unknown>;

      if (typeof record.error === "string") {
        return errorMessages[record.error] ?? fallback;
      }
    }
  } catch {
    return fallback;
  }

  return fallback;
};

export type AiErrorCode =
  | "AI_TOKEN_LIMIT"
  | "AI_PROVIDER_ERROR"
  | "JSON parse error";

const tokenLimitPatterns = [
  "max_tokens",
  "max output tokens",
  "maximum output",
  "token limit",
  "too many tokens",
  "input token",
  "output token",
  "context length",
  "context window",
];

export const getAiErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "";
  }
};

export const isTokenLimitError = (error: unknown): boolean => {
  const message = getAiErrorMessage(error).toLowerCase();
  return tokenLimitPatterns.some((pattern) => message.includes(pattern));
};

export const hasMaxTokensFinishReason = (value: unknown): boolean => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;

  if (
    typeof record.finishReason === "string" &&
    record.finishReason.toUpperCase() === "MAX_TOKENS"
  ) {
    return true;
  }

  return Object.values(record).some((nestedValue) => {
    if (Array.isArray(nestedValue)) {
      return nestedValue.some(hasMaxTokensFinishReason);
    }

    return hasMaxTokensFinishReason(nestedValue);
  });
};

export const createAiErrorResponse = (
  error: unknown,
): Response => {
  const errorCode: AiErrorCode = isTokenLimitError(error)
    ? "AI_TOKEN_LIMIT"
    : "AI_PROVIDER_ERROR";

  return new Response(JSON.stringify({ error: errorCode }), {
    status: errorCode === "AI_TOKEN_LIMIT" ? 413 : 502,
    headers: { "Content-Type": "application/json" },
  });
};

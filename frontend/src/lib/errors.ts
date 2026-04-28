export const ERROR_CODES = {
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  CONFLICT: "CONFLICT",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  OCR_FAILED: "OCR_FAILED",
  EXTERNAL_API_ERROR: "EXTERNAL_API_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  NOT_FOUND: "요청한 정보를 찾을 수 없어요.",
  UNAUTHORIZED: "로그인이 필요해요.",
  FORBIDDEN: "접근 권한이 없어요.",
  CONFLICT: "이미 존재하는 데이터예요.",
  VALIDATION_ERROR: "입력값을 확인해주세요.",
  OCR_FAILED: "처방전 인식에 실패했어요. 다시 시도해주세요.",
  EXTERNAL_API_ERROR: "외부 서비스 연동에 실패했어요.",
  INTERNAL_ERROR: "서버 오류가 발생했어요. 잠시 후 다시 시도해주세요.",
};

export function getErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "response" in err) {
    const res = (err as { response?: { data?: { code?: string; message?: string } } }).response;
    if (res?.data?.message) return res.data.message;
    if (res?.data?.code) return ERROR_MESSAGES[res.data.code as ErrorCode] ?? "알 수 없는 오류가 발생했어요.";
  }
  return "네트워크 오류가 발생했어요.";
}

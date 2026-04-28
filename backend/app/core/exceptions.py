from fastapi import HTTPException, status


class AppException(HTTPException):
    def __init__(self, status_code: int, code: str, message: str):
        super().__init__(status_code=status_code, detail={"code": code, "message": message})


class NotFoundError(AppException):
    def __init__(self, resource: str, id: str | int = ""):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message=f"{resource}을(를) 찾을 수 없어요.",
        )


class UnauthorizedError(AppException):
    def __init__(self, message: str = "인증이 필요해요."):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="UNAUTHORIZED",
            message=message,
        )


class ForbiddenError(AppException):
    def __init__(self, message: str = "접근 권한이 없어요."):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            code="FORBIDDEN",
            message=message,
        )


class ConflictError(AppException):
    def __init__(self, message: str = "이미 존재하는 데이터예요."):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            code="CONFLICT",
            message=message,
        )


class ValidationError(AppException):
    def __init__(self, message: str = "입력값을 확인해주세요."):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="VALIDATION_ERROR",
            message=message,
        )


class OCRProcessingError(AppException):
    def __init__(self, message: str = "처방전 인식에 실패했어요. 다시 시도해주세요."):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="OCR_FAILED",
            message=message,
        )


class ExternalAPIError(AppException):
    def __init__(self, message: str = "외부 서비스 연동에 실패했어요."):
        super().__init__(
            status_code=status.HTTP_502_BAD_GATEWAY,
            code="EXTERNAL_API_ERROR",
            message=message,
        )

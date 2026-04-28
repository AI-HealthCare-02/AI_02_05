from pydantic import BaseModel
from uuid import UUID


class UserDto(BaseModel):
    id: UUID
    nickname: str
    profile_img_url: str | None
    is_new: bool


class AuthResponseDto(BaseModel):
    access_token: str
    refresh_token: str
    user: UserDto

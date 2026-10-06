"""Request and response schemas for account authentication."""

from pydantic import BaseModel, EmailStr, Field


class RegistrationRequest(BaseModel):
    username: str = Field(min_length=3, max_length=32, pattern=r"^[A-Za-z0-9_.-]+$")
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)


class UserResponse(BaseModel):
    id: str
    username: str
    email: EmailStr
    created_at: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse

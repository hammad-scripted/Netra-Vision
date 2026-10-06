"""Request and response schemas for account authentication."""

from pydantic import BaseModel, EmailStr, Field, field_validator


class RegistrationRequest(BaseModel):
    username: str = Field(min_length=3, max_length=32)
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        username = value.strip()
        if not 3 <= len(username) <= 32:
            raise ValueError("Username must be between 3 and 32 characters.")
        if any(not (character.isalnum() or character in " _.-") for character in username):
            raise ValueError("Use letters, numbers, spaces, dots, dashes, or underscores in the username.")
        return username


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

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.users.schemas import UserRead


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.lower()


class AuthResponse(BaseModel):
    user: UserRead
    must_change_password: bool


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=10, max_length=128)

    @model_validator(mode="after")
    def validate_password_strength(self) -> "ChangePasswordRequest":
        password = self.new_password
        has_letter = any(character.isalpha() for character in password)
        has_digit = any(character.isdigit() for character in password)
        if not has_letter or not has_digit:
            raise ValueError("New password must include at least one letter and one number")
        return self

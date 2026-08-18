"""
EduAudit AI - Pydantic Auth Schemas
"""
from typing import Optional, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, model_validator


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    email: EmailStr
    phone: str = Field(..., pattern=r"^\+?[0-9\s\-()]{7,20}$")
    password: str = Field(..., min_length=8)
    confirm_password: str

    @model_validator(mode="after")
    def verify_passwords(self) -> 'RegisterRequest':
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        
        # Simple strong password check
        password = self.password
        if not any(char.isdigit() for char in password):
            raise ValueError("Password must contain at least one digit")
        if not any(char.isupper() for char in password):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(char.islower() for char in password):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(char in "!@#$%^&*()-_=+[]{}|;:',.<>?/`~" for char in password):
            raise ValueError("Password must contain at least one special character")
        return self


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: UUID
    name: str
    email: str
    phone: str
    role: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AuditorProfileResponse(BaseModel):
    id: UUID
    employee_id: str
    department: str
    district: str
    designation: str

    class Config:
        from_attributes = True


class AuditorResponse(BaseModel):
    id: UUID
    user: UserResponse
    employee_id: str
    department: str
    district: str
    designation: str

    class Config:
        from_attributes = True


class AuditorCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    email: EmailStr
    phone: str = Field(..., pattern=r"^\+?[0-9\s\-()]{7,20}$")
    password: str = Field(..., min_length=8)
    employee_id: str = Field(..., min_length=2)
    department: str = Field(..., min_length=2)
    district: str = Field(..., min_length=2)
    designation: str = Field(..., min_length=2)


class TokenPayload(BaseModel):
    sub: str
    role: str
    district: Optional[str] = None
    exp: int
    iat: int


class LoginResponse(BaseModel):
    status: str = "success"
    access_token: Optional[str] = None
    user: UserResponse
    auditor: Optional[AuditorProfileResponse] = None

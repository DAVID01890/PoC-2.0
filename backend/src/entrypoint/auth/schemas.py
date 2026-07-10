from __future__ import annotations

from dataclasses import dataclass


@dataclass
class LoginRequest:
    email: str
    password: str


@dataclass
class RegisterRequest:
    name: str
    email: str
    password: str


@dataclass
class UserResponse:
    id: str
    email: str
    name: str
    role: str
    avatar: str | None = None


@dataclass
class UpdateProfileRequest:
    name: str | None = None
    avatar: str | None = None
    password: str | None = None


@dataclass
class LoginResponse:
    access_token: str
    user: UserResponse | None = None
    token_type: str = "Bearer"

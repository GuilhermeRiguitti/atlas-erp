import type { SessionOptions } from "iron-session";
import type { SessionData } from "./types";

export const defaultSession: SessionData = {};

export const sessionOptions: SessionOptions = {
  cookieName: "atlas_users_session",
  password:
    process.env.IRON_SESSION_PASSWORD ??
    "complex_password_at_least_32_characters_long_for_portfolio",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  },
};

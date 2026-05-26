import type { SessionOptions } from "iron-session";
import type { SessionData } from "./types";

export const defaultSession: SessionData = {};

const sessionPassword = process.env.IRON_SESSION_PASSWORD;

export function assertSessionConfig() {
  if (!sessionPassword && process.env.NODE_ENV === "production") {
    throw new Error("IRON_SESSION_PASSWORD must be configured in production");
  }

  if (sessionPassword && sessionPassword.length < 32) {
    throw new Error("IRON_SESSION_PASSWORD must have at least 32 characters");
  }
}

export const sessionOptions: SessionOptions = {
  cookieName: "erp_fiscal_session",
  password: sessionPassword ?? "dev_only_iron_session_password_32_chars",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  },
};

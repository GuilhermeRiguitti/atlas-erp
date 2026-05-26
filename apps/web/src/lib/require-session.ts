import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { assertSessionConfig, sessionOptions } from "./session";
import type { SessionData } from "./types";

export async function getSession() {
  assertSessionConfig();
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function requireSession() {
  const session = await getSession();
  if (!session.user) {
    return { session, response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  }

  return { session, response: null };
}

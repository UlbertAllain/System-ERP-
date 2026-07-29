import "server-only";

import { cookies } from "next/headers";

import { AUTH_COOKIE } from "@/constants/auth";
import { getCurrentUserFromSessionCookie } from "@/lib/auth/current-user";
import type { CurrentUser } from "@/types/auth";

export async function getSessionCookie(): Promise<string | null> {
  const cookieStore = await cookies();

  return cookieStore.get(AUTH_COOKIE.name)?.value ?? null;
}

export async function setSessionCookie(sessionCookie: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(AUTH_COOKIE.name, sessionCookie, {
    maxAge: AUTH_COOKIE.maxAge,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.delete(AUTH_COOKIE.name);
}

export async function getCurrentUserFromSession(): Promise<CurrentUser | null> {
  const sessionCookie = await getSessionCookie();

  if (!sessionCookie) {
    return null;
  }

  try {
    return await getCurrentUserFromSessionCookie(sessionCookie);
  } catch {
    return null;
  }
}

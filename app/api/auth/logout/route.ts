import { type NextRequest, NextResponse } from "next/server";

function clearSessionCookie(response: NextResponse) {
  response.cookies.set("__session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}

export async function POST() {
  return clearSessionCookie(
    NextResponse.json({
      success: true,
      message: "Logout berhasil.",
    }),
  );
}

export async function GET(request: NextRequest) {
  return clearSessionCookie(
    NextResponse.redirect(new URL("/login", request.url)),
  );
}

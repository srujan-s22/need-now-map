import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  AUTHORITY_COOKIE_NAME,
  createSessionToken,
  isAuthorized,
  verifyPasscode,
} from "@/lib/auth";

export async function GET() {
  const authorized = await isAuthorized();
  return NextResponse.json({ isUnlocked: authorized });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const passcode = body?.passcode;

    if (!passcode || typeof passcode !== "string") {
      return NextResponse.json(
        { success: false, error: "Passcode is required." },
        { status: 400 }
      );
    }

    if (!verifyPasscode(passcode)) {
      return NextResponse.json(
        { success: false, error: "Invalid authorization passcode." },
        { status: 401 }
      );
    }

    const token = createSessionToken();
    const cookieStore = await cookies();

    cookieStore.set(AUTHORITY_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Auth verify error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(AUTHORITY_COOKIE_NAME);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Auth lock error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}

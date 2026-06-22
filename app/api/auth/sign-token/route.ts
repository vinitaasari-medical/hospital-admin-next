import { NextResponse } from "next/server";
import { SignJWT } from "jose";

// Server-side JWT signing — keeps the secret off the client bundle.
// Called only from apiClient.ts when shouldUseDefaultToken: true.
export async function POST(): Promise<NextResponse> {
  const raw = process.env.DEFAULT_SECRET_KEY;
  if (!raw) {
    return NextResponse.json(
      { error: "Token service unavailable" },
      { status: 503 }
    );
  }
  const secret = new TextEncoder().encode(raw);
  const token = await new SignJWT({ user_type: "hospital-admin" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT", channel: "web" })
    .sign(secret);
  return NextResponse.json({ token });
}

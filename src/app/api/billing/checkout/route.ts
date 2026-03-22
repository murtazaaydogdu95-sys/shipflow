import { NextResponse } from "next/server";

// Checkout is now handled client-side via Paddle.js overlay.
// This route is kept as a stub to avoid 404s from old clients.
export async function POST() {
  return NextResponse.json(
    { error: "Checkout is now handled client-side via Paddle.js" },
    { status: 410 }
  );
}

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    product: "isyagent",
    timestamp: new Date().toISOString(),
  });
}

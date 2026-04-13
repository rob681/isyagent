import { NextResponse } from "next/server";

export async function GET() {
  // Test Anthropic connectivity
  let anthropicStatus = "unknown";
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    // Make a minimal request to verify connectivity + API key
    await client.messages.create({
      model: "claude-haiku-4-20250514",
      max_tokens: 5,
      messages: [{ role: "user", content: "hi" }],
    });
    anthropicStatus = "ok";
  } catch (err: any) {
    anthropicStatus = `error: ${err?.status ?? "?"} ${err?.message?.slice(0, 80) ?? "unknown"}`;
  }

  return NextResponse.json({
    status: "ok",
    product: "isyagent",
    timestamp: new Date().toISOString(),
    anthropic: anthropicStatus,
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { createAnthropic } from "@ai-sdk/anthropic";
import { streamObject } from "ai";
import { LintResultSchema } from "@/lib/schemas";
import { LINT_SYSTEM, LINT_USER } from "@/lib/prompts";
import { CLAUDE_MODEL, MAX_TEXT_LENGTH } from "@/lib/config";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    // --- Parse body (before rate limiting so malformed requests don't consume tokens) ---
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { text } = body as { text?: unknown };

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text is required and must be a string" },
        { status: 400 }
      );
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters` },
        { status: 400 }
      );
    }

    // --- Rate limiting (only valid requests consume tokens) ---
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { allowed, remaining, retryAfter } = checkRateLimit(ip);

    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded — try again later" },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": "0",
            "Retry-After": String(retryAfter),
          },
        }
      );
    }

    // --- Stream empathy flags ---
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("ANTHROPIC_API_KEY is not set");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const provider = createAnthropic({ apiKey });

    const result = streamObject({
      model: provider(CLAUDE_MODEL),
      schema: LintResultSchema,
      system: LINT_SYSTEM,
      prompt: LINT_USER(text),
      temperature: 0,
    });

    return result.toTextStreamResponse({
      headers: { "X-RateLimit-Remaining": String(remaining) },
    });
  } catch (err) {
    console.error("Lint API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

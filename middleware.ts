import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge middleware — runs before every API route.
 *
 * Guards:
 *  1. Origin validation — blocks cross-origin requests unless explicitly allowed
 *  2. Body size limit  — rejects oversized payloads before they hit the route
 *  3. CORS headers     — proper preflight handling for same-origin requests
 */

export const config = {
  matcher: "/api/:path*",
};

// ---------------------------------------------------------------------------
// Origin allow-list
// ---------------------------------------------------------------------------

function isAllowedOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);

    // Always allow localhost in development
    if (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1"
    ) {
      return true;
    }

    // Allow the configured production origin (e.g. https://empathy-linter.vercel.app)
    const allowed = process.env.ALLOWED_ORIGIN;
    if (allowed && origin === allowed) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// CORS helpers
// ---------------------------------------------------------------------------

function corsHeaders(origin: string): Record<string, string> {
  const allowed = isAllowedOrigin(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

const MAX_BODY_BYTES = 16_384; // 16 KB — generous for 5 000 chars of text

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin") ?? "";

  // --- Preflight --------------------------------------------------------
  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }

  // --- Origin check -----------------------------------------------------
  // Browsers send the Origin header on same-origin POST requests too.
  // If the header is present, validate it. If absent (non-browser client),
  // fall through to rate limiting in the route handler.
  if (origin && !isAllowedOrigin(origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // --- Body size guard --------------------------------------------------
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "Request body too large" },
      { status: 413 }
    );
  }

  // --- Forward with CORS headers ----------------------------------------
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(corsHeaders(origin))) {
    response.headers.set(key, value);
  }
  return response;
}

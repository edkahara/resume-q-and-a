import { rateLimit } from "@/lib/rate-limit";

const ALLOWED = {
  GET: new Set(["health"]),
  POST: new Set(["ask"]),
};

type Context = { params: Promise<{ path: string[] }> };

async function proxy(
  request: Request,
  context: Context,
  method: keyof typeof ALLOWED,
) {
  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) {
    return Response.json(
      { detail: "API_BASE_URL is not configured" },
      { status: 500 },
    );
  }

  const { path } = await context.params;
  const target = path.join("/");
  if (!ALLOWED[method].has(target)) {
    return Response.json({ detail: "Not found" }, { status: 404 });
  }

  // Check whether the IP address has exceeded the rate limit
  if (target === "ask") {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";
    const { ok, retryAfter } = rateLimit(ip);
    if (!ok) {
      return Response.json(
        { detail: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }
  }

  let backendResponse: Response;
  try {
    backendResponse = await fetch(`${baseUrl}/${target}`, {
      method,
      headers:
        method === "POST" ? { "Content-Type": "application/json" } : undefined,
      body: method === "POST" ? await request.text() : undefined,
      cache: "no-store",
    });
    return new Response(backendResponse.body, {
      status: backendResponse.status,
      headers: {
        "Context-Type":
          backendResponse.headers.get("content-type") ?? "text/plain",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json(
      { detail: "Backend could not be reached" },
      { status: 502 },
    );
  }
}

export async function GET(request: Request, context: Context) {
  return proxy(request, context, "GET");
}

export async function POST(request: Request, context: Context) {
  return proxy(request, context, "POST");
}

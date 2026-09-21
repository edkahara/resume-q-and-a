const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

const ipHistory = new Map<string, number[]>();
let lastCleanup = 0;

/**
 * Remove IP addresses that haven't sent an API request in over a minute
 */
function cleanupStaleIPs(now: number) {
  // Only perform cleanups if the last one was over a minute ago
  if (now - lastCleanup < RATE_LIMIT_WINDOW_MS) {
    return;
  }
  lastCleanup = now;
  // Remove an IP address if the last request was over a minute ago
  for (const [ip, times] of ipHistory) {
    if (now - times[times.length - 1] >= RATE_LIMIT_WINDOW_MS) {
      ipHistory.delete(ip);
    }
  }
}

/**
 * Limits the number of allowed API requests per IP address per minute.
 */
export function rateLimit(ip: string) {
  const now = Date.now();
  cleanupStaleIPs(now);

  // Get the requests that occured in the last minute
  const recentRequests = (ipHistory.get(ip) ?? []).filter(
    (time) => now - time < RATE_LIMIT_WINDOW_MS,
  );
  // Block the request if the rate limit is exceeded
  if (recentRequests.length >= MAX_REQUESTS) {
    ipHistory.set(ip, recentRequests);
    // Retry after the oldest timestamp is over a minute old
    return {
      ok: false,
      retryAfter: Math.ceil(
        (recentRequests[0] + RATE_LIMIT_WINDOW_MS - now) / 1000,
      ),
    };
  }
  // Add the current request timestamp to the IP address's history
  recentRequests.push(now);
  ipHistory.set(ip, recentRequests);
  return { ok: true, retryAfter: 0 };
}

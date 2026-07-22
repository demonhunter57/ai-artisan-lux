interface Bucket {
  count: number;
  resetAt: number;
}

// Stockage en memoire : suffisant pour une seule instance, se reinitialise au redeploiement
// et n'est pas partage entre instances si l'app tourne en multi-process/serverless distribue.
const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) {
    return false;
  }

  bucket.count += 1;
  return true;
}

export function getClientKey(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}

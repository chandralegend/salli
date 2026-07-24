// A metered action hit its monthly plan limit (HTTP 402). Screens catch this to
// show the QuotaBanner + Upgrade CTA instead of a generic error.
export class QuotaError extends Error {
  metric?: string;
  constructor(metric?: string) {
    super("quota_exceeded");
    this.name = "QuotaError";
    this.metric = metric;
  }
}

export function isQuotaError(err: unknown): err is QuotaError {
  return err instanceof QuotaError;
}

/** Best-effort detection of a 402 on an error thrown by the generated SDK
 * (`throwOnError`), which surfaces the response on `.response`/`.status`. */
export function isQuotaLikeError(err: unknown): boolean {
  if (isQuotaError(err)) return true;
  const e = err as { status?: number; response?: { status?: number } } | null;
  return e?.status === 402 || e?.response?.status === 402;
}

/** FR-006: no máximo 5 solicitações de código por e-mail por hora. */
export const MAX_CODE_REQUESTS_PER_HOUR = 5;
const WINDOW_MS = 60 * 60 * 1000;

export interface RateLimitResult {
  allowed: boolean;
  /** Solicitações dentro da janela, incluindo a atual quando permitida. */
  recent: Date[];
}

export function checkRateLimit(previous: Date[], now: Date): RateLimitResult {
  const windowStart = now.getTime() - WINDOW_MS;
  const inWindow = previous.filter((request) => request.getTime() > windowStart);
  if (inWindow.length >= MAX_CODE_REQUESTS_PER_HOUR) {
    return { allowed: false, recent: inWindow };
  }
  return { allowed: true, recent: [...inWindow, now] };
}

/** Prevent open redirects: only same-app relative paths. */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/my";
  }
  return next;
}

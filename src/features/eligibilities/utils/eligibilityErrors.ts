export function getSafeEligibilityMessage(
  candidate: unknown,
  fallback: string,
): string {
  const message = typeof candidate === 'string' ? candidate.trim() : ''
  // Business validation is useful; internal diagnostics must stay out of the UI.
  if (
    message &&
    message.length <= 500 &&
    !/SQLSTATE|\bSQL\b|exception|stack\s*trace|traceback|\b(?:select|insert|update|delete)\s+.+\b(?:from|into|set)\b|\.php\b|[A-Z]:\\|\/var\/|\/vendor\/|[<>\r\n]/i.test(message)
  ) {
    return message
  }
  return fallback
}

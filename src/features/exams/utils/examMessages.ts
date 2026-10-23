export function safeExamMessage(value: unknown, fallback: string): string {
  const message = typeof value === 'string' ? value.trim() : ''
  return message &&
    message.length <= 500 &&
    !/SQLSTATE|exception|stack\s*trace|traceback|\.php\b|[A-Z]:\\|\/var\/|\/vendor\/|[<>]/i.test(
      message,
    )
    ? message
    : fallback
}

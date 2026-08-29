const handledResponseIds = new Set<string>();
const MAX_HANDLED_RESPONSES = 100;

/** Returns true exactly once for a notification action in this app process. */
export function consumeNotificationResponse(identifier: string, actionIdentifier: string): boolean {
  const responseId = `${identifier}:${actionIdentifier}`;
  if (handledResponseIds.has(responseId)) return false;
  handledResponseIds.add(responseId);
  if (handledResponseIds.size > MAX_HANDLED_RESPONSES) {
    const oldest = handledResponseIds.values().next().value;
    if (oldest) handledResponseIds.delete(oldest);
  }
  return true;
}

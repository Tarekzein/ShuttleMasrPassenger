import { consumeNotificationResponse } from './notificationResponse';

describe('notification response replay protection', () => {
  it('consumes the same notification action only once across layout remounts', () => {
    expect(consumeNotificationResponse('notification-1', 'default')).toBe(true);
    expect(consumeNotificationResponse('notification-1', 'default')).toBe(false);
    expect(consumeNotificationResponse('notification-1', 'reply')).toBe(true);
  });
});

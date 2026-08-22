export const en = {
  common: { appName: 'Shuttle Masr', retry: 'Retry', cancel: 'Cancel', confirm: 'Confirm', save: 'Save', egp: 'EGP' },
  tabs: { home: 'Home', bookings: 'Bookings', notifications: 'Notifications', profile: 'Profile' },
  auth: { title: 'Passenger Portal', phone: 'Enter your phone number to continue', code: 'Enter the 6-digit verification code', send: 'Send code', verify: 'Verify', invalidRole: 'This account is not a passenger account' },
  home: { title: 'Where are you going?', origin: 'Pickup', destination: 'Destination', locate: 'Use my location', search: 'Find trips', noTrips: 'No trips found near these points', permission: 'Location permission was denied. Move both pins manually.' },
  bookings: { title: 'My Bookings', upcoming: 'Upcoming', active: 'Active', completed: 'Completed', cancelled: 'Cancelled', empty: 'No bookings in this category' },
  profile: { title: 'Profile', wallet: 'Wallet', balance: 'Balance', outstanding: 'Outstanding', transactions: 'Transactions', personal: 'Personal information', language: 'Language', notifications: 'Push notifications', logout: 'Logout' },
  tracking: {
    title: 'Track your ride', status: 'Trip status', driver: 'Driver', shuttle: 'Shuttle', stops: 'Stops',
    yourPickup: 'Your pickup', destination: 'Destination', callDriver: 'Call driver',
    etaPickup: 'Driver is on the way to your pickup point.', etaDestination: 'On the way to your destination.',
    outstandingTitle: 'Outstanding balance', outstandingFrom: 'Outstanding from Trip #{{ref}}',
    state: { SCHEDULED: 'Scheduled', BOARDING: 'Boarding', IN_PROGRESS: 'In progress', COMPLETED: 'Completed', CANCELLED: 'Cancelled' },
    stopState: { PENDING: 'Upcoming', ARRIVED: 'Arrived', WAITING: 'Waiting', COMPLETED: 'Done', SKIPPED: 'Skipped' },
  },
};

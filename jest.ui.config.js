/**
 * UI/component tests run under the jest-expo preset (React Native runtime).
 * Kept separate from the fast node/ts-jest logic config (jest.config.js).
 */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/*.ui.test.tsx'],
};

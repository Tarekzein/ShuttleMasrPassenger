module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  setupFiles: ['<rootDir>/src/__mocks__/globals.ts'],
  moduleNameMapper: {
    '^expo-constants$': '<rootDir>/src/__mocks__/expo-constants.ts',
    '^expo-secure-store$': '<rootDir>/src/__mocks__/empty.ts',
    '^socket.io-client$': '<rootDir>/src/__mocks__/empty.ts',
  },
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: { esModuleInterop: true, strict: false } }] },
};

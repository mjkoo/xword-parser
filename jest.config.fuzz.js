/** @type {import('jest').Config} */
export default {
  displayName: { name: "Jazzer.js", color: "cyan" },
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["<rootDir>/fuzz/*.fuzz.ts"],
  testRunner: "@jazzer.js/jest-runner",
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1"
  },
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          sourceMap: true
        }
      }
    ]
  },
  collectCoverage: true,
  coverageDirectory: "coverage-fuzz",
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.test.ts",
    "!src/**/*.d.ts"
  ],
  coverageReporters: ["json", "lcov", "text", "html"]
};
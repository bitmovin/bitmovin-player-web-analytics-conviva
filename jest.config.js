// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html

module.exports = {

  // Automatically clear mock calls and instances between every test
  clearMocks: true,

  // The directory where Jest should output its coverage files
  coverageDirectory: "coverage",

  // A map from regular expressions to paths to transformers
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },

  // A set of global variables that need to be available in all test environments.
  globals: {
    window: { },
  },

  setupFilesAfterEnv: [
    '<rootDir>/spec/helper/TestsHelper.ts',
  ]
};

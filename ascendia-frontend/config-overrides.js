const path = require('path')

module.exports = {
  webpack: (config) => config,
  jest: (config) => {
    // Allow CRA to discover tests moved outside src/
    config.roots = [
      path.resolve(__dirname, 'src'),
      path.resolve(__dirname, 'test')
    ]

    config.testMatch = [
      '<rootDir>/test/**/__tests__/**/*.{js,jsx,ts,tsx}',
      '<rootDir>/test/**/*.{spec,test}.{js,jsx,ts,tsx}',
      '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
      '<rootDir>/src/**/*.{spec,test}.{js,jsx,ts,tsx}'
    ]

    config.transformIgnorePatterns = config.transformIgnorePatterns.map((pattern) =>
      pattern.includes('node_modules')
        ? pattern.replace('node_modules', 'node_modules/(?!axios)')
        : pattern
    )

    return config
  }
}

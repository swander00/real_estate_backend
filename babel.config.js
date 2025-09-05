/**
 * Babel Configuration for Jest
 * Enables ES6+ features in tests
 */

export default {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 'current'
        },
        modules: 'auto'
      }
    ]
  ],
  plugins: []
};

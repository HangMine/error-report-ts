module.exports = {
  root: true,
  env: {
    browser: true,
  },
  extends: [
    require.resolve('@4dst-saas/rules-preset/index.js'),
  ],
  globals: {
    globalThis: false,
  },
};

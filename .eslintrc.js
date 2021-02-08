module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
  },
  extends: [
    require.resolve('@4dst-saas/rules-preset/index.js'),
  ],
  globals: {
    globalThis: false,
  },
  overrides: [{
    files: ['*.ts', '*.tsx'],
    rules: {
      // ts文件不校验import
      'import/no-unresolved': 'off',
    },
    settings: {
      'import/resolver': {
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.d.ts', '.vue'],
          paths: ['.'],
        },
        alias: {
          extensions: ['.ts', '.js', '.jsx', '.json'],
          map: [
            ['@', 'src'],
          ],
        },
      },
    },
  }],
};

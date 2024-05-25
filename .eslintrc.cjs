module.exports = {
  parser: 'vue-eslint-parser',
  parserOptions: {
    ecmaVersion: 2020,
    parser: '@typescript-eslint/parser',
    sourceType: 'module',
  },
  plugins: ["@typescript-eslint"],
  // "extends": ["plugin:@typescript-eslint/recommended"],
  env: {
    "node": true,
    "es6": true
  },
  rules: {
    "@typescript-eslint/no-unused-vars": 1,//未使用变量
    "eqeqeq": ["warn", "always", { "null": "ignore" }],//非null的绝对等于
    "no-console": 0,//无需console的地方期望使用clg（生产模式不会console）
    "@typescript-eslint/explicit-module-boundary-types": 0,//禁止namespace与模块混用
    // "@typescript-eslint/no-explicit-any": 0,
    // "@typescript-eslint/no-extra-semi": 0,
    "prefer-const": 0,//不变量使用const
    "@typescript-eslint/ban-types": 1,//办掉部分有问题的类型使用
    // "@typescript-eslint/no-non-null-assertion": 0
    "@typescript-eslint/no-require-imports": 2,//不允许使用require导入
  }
}

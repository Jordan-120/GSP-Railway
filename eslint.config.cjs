// eslint.config.cjs

const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  // Base recommended rules
  js.configs.recommended,

  // Backend: Node, CommonJS
  {
    files: ["backend/**/*.js"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "script", // uses require/module.exports
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-console": "off",
    },
  },

  // Frontend: browser, ES modules
  {
    files: ["frontend/**/*.js"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module", // allows import/export
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },

  // Jest tests (backend/tests)
  {
    files: ["backend/tests/**/*.js"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "script",
      globals: {
        ...globals.jest,
      },
    },
  },
];

module.exports = {
  parser: "@typescript-eslint/parser",
  extends: [
    "prettier",
    "plugin:prettier/recommended",
    "plugin:react/recommended",
  ],
  plugins: ["react-hooks", "import"],
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true, // Lint JSX
    },
  },
  rules: {
    // General rules
    "import/order": [
      "error",
      {
        alphabetize: {
          order:
            "asc" /* sort in ascending order. Options: ['ignore', 'asc', 'desc'] */,
          caseInsensitive: true /* ignore case. Options: [true, false] */,
        },
        "newlines-between": "never",
      },
    ],

    "import/no-duplicates": ["error"],

    // Run prettier as part of linting
    "prettier/prettier": "error",

    // React rules
    "react/prop-types": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "error",
  },
  overrides: [
    {
      files: ["*.ts?(x)"],
      plugins: ["@typescript-eslint"],
      extends: [
        "plugin:@typescript-eslint/recommended",
        "prettier/@typescript-eslint",
      ],
      rules: {
        // Typescript rules
        "@typescript-eslint/interface-name-prefix": "off",
        "@typescript-eslint/no-unused-vars": [
          "error",
          { argsIgnorePattern: "^_" },
        ],
        "@typescript-eslint/explicit-function-return-type": [
          "warn",
          {
            allowExpressions: true,
            allowTypedFunctionExpressions: true,
            allowHigherOrderFunctions: true,
          },
        ],
      },
    },
  ],
  settings: {
    react: {
      version: "detect", // Automatically detect the version of React
    },
  },
};

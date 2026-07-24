import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        localStorage: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        fetch: "readonly",
        Peer: "readonly",
        Chart: "readonly",
        CodeMirror: "readonly",
        jspdf: "readonly",
        module: "readonly",
        exports: "readonly",
        require: "readonly",
        process: "readonly",
        __dirname: "readonly"
      }
    },
    rules: {
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      "no-undef": "off",
      "no-console": "off",
      "no-empty": "warn"
    }
  }
];

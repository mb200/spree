import babel from "@rollup/plugin-babel";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";

const extensions = [".js", ".jsx", ".ts", ".tsx"];
const exclude = "node_modules/**";

export default {
  input: "src/index.ts",
  external: ["react", "react-dom"],
  output: {
    file: "dist/index.js",
    format: "cjs",
  },
  plugins: [
    commonjs(),
    resolve({ jsnext: true, extensions, exclude }),
    babel({
      exclude,
      extensions,
      babelHelpers: "bundled",
    }),
  ],
};

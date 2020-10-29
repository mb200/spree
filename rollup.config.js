import babel from "@rollup/plugin-babel";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
const packageJson = require("./package.json");

const extensions = [".js", ".jsx", ".ts", ".tsx"];
const exclude = /node_modules/;
function globals() {
  return {
    react: "React",
    "react-dom": "ReactDOM",
  };
}
const peerDependencies = Object.keys(packageJson.peerDependencies);
const devDependencies = Object.keys(packageJson.devDependencies);
const externalDeps = peerDependencies.concat(devDependencies);

export default {
  input: "src/index.ts",
  external: externalDeps,
  output: {
    file: "dist/index.js",
    sourcemap: true,
    format: "cjs",
    globals: globals(),
  },
  plugins: [
    commonjs(),
    resolve({ extensions, exclude }),
    babel({
      exclude,
      extensions,
      babelHelpers: "bundled",
    }),
  ],
};

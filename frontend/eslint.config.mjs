import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { globalIgnores } from "eslint/config";

const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,
  globalIgnores(["tests/**/*.cjs"]),
];

export default eslintConfig;

import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const baseDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/*.d.ts"],
    },
  },
  resolve: {
    alias: {
      "@core": path.resolve(baseDir, "src/core"),
      "@matcher": path.resolve(baseDir, "src/matcher"),
      "@resolver": path.resolve(baseDir, "src/resolver"),
      "@engine": path.resolve(baseDir, "src/engine"),
      "@infrastructure": path.resolve(baseDir, "src/infrastructure"),
      "@packs": path.resolve(baseDir, "src/packs"),
    },
  },
});

import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts", "./src/test/setup-dom.ts"],
    environmentMatchGlobs: [
      ["src/**/*.test.tsx", "jsdom"],
    ],
    coverage: {
      include: ["src/lib/**/*.ts", "src/components/**/*.tsx", "src/types/**/*.ts", "src/app/api/**/*.ts"],
      exclude: ["src/lib/prisma.ts", "src/lib/auth.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

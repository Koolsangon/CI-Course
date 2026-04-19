import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, ".")
    }
  },
  test: {
    globals: true,
    environment: "node",
    include: ["lib/**/*.test.ts", "components/**/__tests__/*.test.ts"],
    exclude: ["node_modules/**", "tests/e2e/**", ".next/**"]
  }
});

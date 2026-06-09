// Only load dotenv in development (not available in production Docker image)
if (process.env.NODE_ENV !== "production") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  try { require("dotenv/config"); } catch { /* dotenv not available in production */ }
}
import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
});

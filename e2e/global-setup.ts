import { execSync } from "child_process";
import path from "path";
import dotenv from "dotenv";

// Load test env vars
dotenv.config({ path: path.resolve(__dirname, "../.env.test"), override: true });

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://codepylot:codepylot@localhost:5432/codepylot_test";

export default async function globalSetup() {
  console.log("Running E2E global setup...");

  const env = { ...process.env, DATABASE_URL };

  // Push schema to test DB
  execSync("npx prisma db push --skip-generate", {
    stdio: "inherit",
    env,
  });

  // Seed test data
  execSync("npx tsx e2e/seed-test-db.ts", {
    stdio: "inherit",
    env,
  });

  console.log("E2E global setup complete");
}

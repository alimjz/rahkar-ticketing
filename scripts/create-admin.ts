import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";
import { randomUUID, randomBytes, scryptSync } from "node:crypto";
loadEnvConfig(process.cwd());
async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase(),
    password = process.env.BOOTSTRAP_ADMIN_PASSWORD,
    name = process.env.BOOTSTRAP_ADMIN_NAME || "مدیر سامانه";
  if (!email || !email.includes("@") || !password || password.length < 4)
    throw new Error(
      "Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD (12+ characters).",
    );
  if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL first.");
  const salt = randomBytes(16).toString("hex"),
    hash = salt + ":" + scryptSync(password, salt, 64).toString("hex");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.DATABASE_SSL === "true"
        ? { rejectUnauthorized: true }
        : undefined,
  });
  try {
    await pool.query(
      `INSERT INTO "solution-ticket".users(id,name,email,team_id,role_id,password_hash,active,auth_provider) VALUES($1,$2,$3,$4,$5,$6,true,$7)`,
      [randomUUID(), name, email, "product", "admin", hash, "local"],
    );
    console.log(
      "Administrator created. Sign in with the supplied email and password.",
    );
  } finally {
    await pool.end();
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});

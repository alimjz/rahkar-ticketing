import { Pool, type PoolClient } from "pg";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { join } from "node:path";
import { seed } from "./seed";
import type { Store } from "./model";
export const demo = process.env.DEMO_MODE === "true";
const globals = globalThis as unknown as {
  rahkarPool?: Pool;
  rahkarLock?: Promise<unknown>;
};
export function pool() {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL is required outside demo mode.");
  return (globals.rahkarPool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    ssl:
      process.env.DATABASE_SSL === "true"
        ? { rejectUnauthorized: true }
        : undefined,
  }));
}
const schema = "solutionticket";

const entities = [
  "teams",
  "roles",
  "users",
  "tickets",
  "comments",
  "work_logs",
  "history",
] as const;
const file = join(process.cwd(), ".data", "demo.json");
async function readDemo(): Promise<Store> {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    return seed();
  }
}
async function loadDB(c: PoolClient): Promise<Store> {
  const result: Record<string, unknown> = {};
  for (const table of entities)
    result[table] = (
      await c.query(
        `SELECT to_jsonb(t) AS data FROM "${schema}".` + table + " t",
      )
    ).rows.map((r) => r.data);
  result.settings = (
    await c.query(`SELECT value FROM "${schema}".app_settings WHERE id=1`)
  ).rows[0]?.value;
  if (!result.settings)
    throw new Error(
      "Database has not been initialized. Run schema.sql and seed.sql.",
    );
  return result as Store;
}
async function saveDB(c: PoolClient, state: Store, previous: Store) {
  for (const table of entities)
    for (const row of state[table]) {
      const old = previous[table].find((x) => x.id === row.id);
      if (old && JSON.stringify(old) === JSON.stringify(row)) continue;
      const fields = Object.keys(row);
      const values = Object.values(row).map((v) =>
        Array.isArray(v) || (v && typeof v === "object")
          ? JSON.stringify(v)
          : v,
      );
      await c.query(
        `INSERT INTO ${schema}.` +
          table +
          " (" +
          fields.map((f) => '"' + f + '"').join(",") +
          ") VALUES (" +
          fields.map((_, i) => "$" + (i + 1)).join(",") +
          ") ON CONFLICT(id) DO UPDATE SET " +
          fields
            .filter((f) => f !== "id")
            .map((f) => '"' + f + '"=EXCLUDED."' + f + '"')
            .join(","),
        values,
      );
    }
  if (JSON.stringify(state.settings) !== JSON.stringify(previous.settings))
    await c.query("UPDATE app_settings SET value=$1 WHERE id=1", [
      JSON.stringify(state.settings),
    ]);
}
export async function readStore(): Promise<Store> {
  if (demo) return readDemo();
  const c = await pool().connect();
  try {
    await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const s = await loadDB(c);
    await c.query("COMMIT");
    return s;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
export async function mutateStore<T>(
  fn: (s: Store) => T | Promise<T>,
): Promise<T> {
  if (demo) {
    const task = (globals.rahkarLock ?? Promise.resolve())
      .catch(() => {})
      .then(async () => {
        const s = await readDemo();
        const result = await fn(s);
        await mkdir(join(process.cwd(), ".data"), { recursive: true });
        await writeFile(file + ".tmp", JSON.stringify(s), "utf8");
        await rename(file + ".tmp", file);
        return result;
      });
    globals.rahkarLock = task;
    return task;
  }
  const c = await pool().connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT pg_advisory_xact_lock(824721)");
    const s = await loadDB(c),
      old = structuredClone(s);
    const result = await fn(s);
    await saveDB(c, s, old);
    await c.query("COMMIT");
    return result;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}

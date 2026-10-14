import { writeFileSync } from "node:fs";
import { seed } from "../src/lib/seed";
const s = seed();
const q = (x: unknown) => "'" + String(x).replace(/'/g, "''") + "'";
let sql =
  "-- Rahkar default configuration only. No sample users or tickets.\nBEGIN;\n";
for (const t of s.teams)
  sql +=
    "INSERT INTO teams(id,name,code,description,color,active) VALUES(" +
    [t.id, t.name, t.code, t.description, t.color].map(q).join(",") +
    ",true) ON CONFLICT DO NOTHING;\n";
for (const r of s.roles)
  sql +=
    "INSERT INTO roles(id,name,permissions) VALUES(" +
    [r.id, r.name, JSON.stringify(r.permissions)].map(q).join(",") +
    ") ON CONFLICT DO NOTHING;\n";
sql +=
  "INSERT INTO app_settings(id,value) VALUES(1," +
  q(JSON.stringify(s.settings)) +
  ") ON CONFLICT DO NOTHING;\nCOMMIT;\n";
writeFileSync("db/seed.sql", sql, "utf8");

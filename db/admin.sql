-- Rahkar default administrator DML
-- Run after db/schema.sql and db/seed.sql:
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/admin.sql
--
-- Login identifier: admin@rahkar.local
-- Display name: Admin
-- The password is stored as a scrypt hash; do not replace it with plain text.
BEGIN;
INSERT INTO users (
  id, name, email, team_id, role_id, active, password_hash, auth_provider, external_id
)
SELECT
  'admin', 'Admin', 'admin@rahkar.local', 'product', 'admin', true,
  'rahkar-admin-fixed-salt-2026:f141d87f256fac9557c98632f2a34c416559ee1c2e2c44fdeac8a79785ddf70c60a0b9579db80cbc32c08c3618942c373bc2c7ae7088d359c237b0de73e495ae',
  'local', NULL
WHERE EXISTS (SELECT 1 FROM teams WHERE id = 'product')
  AND EXISTS (SELECT 1 FROM roles WHERE id = 'admin')
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  team_id = EXCLUDED.team_id,
  role_id = EXCLUDED.role_id,
  active = true,
  password_hash = EXCLUDED.password_hash,
  auth_provider = 'local',
  external_id = NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@rahkar.local') THEN
    RAISE EXCEPTION 'Admin prerequisites are missing. Run db/seed.sql before db/admin.sql.';
  END IF;
END $$;
COMMIT;

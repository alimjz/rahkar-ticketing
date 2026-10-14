-- Rahkar PostgreSQL 15+ DDL. Apply once to an empty database.
BEGIN;
CREATE TABLE teams (
 id text PRIMARY KEY, name varchar(120) NOT NULL, code varchar(12) NOT NULL UNIQUE,
 description text NOT NULL DEFAULT '', color varchar(7) NOT NULL DEFAULT '#7160ce',
 active boolean NOT NULL DEFAULT true, CHECK(code ~ '^[A-Z0-9_-]{2,12}$')
);
CREATE TABLE roles (id text PRIMARY KEY, name varchar(100) NOT NULL, permissions jsonb NOT NULL DEFAULT '[]', CHECK(jsonb_typeof(permissions)='array'));
CREATE TABLE users (
 id text PRIMARY KEY, name varchar(160) NOT NULL, email varchar(254) NOT NULL UNIQUE,
 team_id text NOT NULL REFERENCES teams(id), role_id text NOT NULL REFERENCES roles(id),
 active boolean NOT NULL DEFAULT true, password_hash text,
 auth_provider varchar(20) NOT NULL DEFAULT 'local' CHECK(auth_provider IN ('local','directory')),
 external_id text, CHECK(email=lower(email)), UNIQUE(auth_provider,external_id)
);
CREATE TABLE tickets (
 id text PRIMARY KEY, number integer NOT NULL UNIQUE,
 subject varchar(300) NOT NULL CHECK(length(trim(subject))>0), description text NOT NULL,
 type varchar(4) NOT NULL CHECK(type IN ('SR','IR','CR','TASK')),
 priority varchar(8) NOT NULL CHECK(priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
 status varchar(16) NOT NULL CHECK(status IN ('OPEN','IN_PROGRESS','WAITING','RESOLVED','CLOSED')),
 requester_id text NOT NULL REFERENCES users(id), source_team_id text NOT NULL REFERENCES teams(id),
 team_id text NOT NULL REFERENCES teams(id), assignee_id text REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 resolved_at timestamptz, resolution text NOT NULL DEFAULT '',
 sla_hours integer CHECK(sla_hours BETWEEN 1 AND 87600), deadline_at timestamptz,
 CHECK(type<>'TASK' OR (sla_hours IS NULL AND deadline_at IS NULL AND requester_id=assignee_id)),
 CHECK(deadline_at IS NULL OR type='CR'),
 CHECK(status NOT IN ('RESOLVED','CLOSED') OR (resolved_at IS NOT NULL AND length(trim(resolution))>0))
);
CREATE TABLE comments (
 id text PRIMARY KEY, ticket_id text NOT NULL REFERENCES tickets(id),
 user_id text NOT NULL REFERENCES users(id), body text NOT NULL CHECK(length(trim(body))>0), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE work_logs (
 id text PRIMARY KEY, ticket_id text NOT NULL REFERENCES tickets(id),
 user_id text NOT NULL REFERENCES users(id), minutes integer NOT NULL CHECK(minutes BETWEEN 1 AND 1440),
 note text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE history (
 id text PRIMARY KEY, ticket_id text NOT NULL REFERENCES tickets(id),
 user_id text NOT NULL REFERENCES users(id), action text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE app_settings (id integer PRIMARY KEY CHECK(id=1), value jsonb NOT NULL CHECK(jsonb_typeof(value)='object'));
CREATE INDEX tickets_team_status ON tickets(team_id,status);
CREATE INDEX tickets_requester ON tickets(requester_id);
CREATE INDEX tickets_assignee ON tickets(assignee_id,status);
CREATE INDEX tickets_updated ON tickets(updated_at DESC);
CREATE INDEX comments_ticket ON comments(ticket_id,created_at);
CREATE INDEX history_ticket ON history(ticket_id,created_at);
CREATE INDEX work_logs_ticket ON work_logs(ticket_id,created_at);
COMMIT;

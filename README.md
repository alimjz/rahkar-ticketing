# Rahkar

A Persian RTL ticketing system for managing service requests, incidents, changes, and personal tasks.

## Production Deployment with PostgreSQL

1. Copy `.env.production.example` to `.env.production` and update the PostgreSQL connection details, domain, and `AUTH_SECRET`. The `AUTH_SECRET` must be at least 32 random characters.
2. Create the database and execute the following files in order:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/schema.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/seed.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/admin.sql
```

You can also use scripts create-admin.ts and generate-seed.ts to insert your own configured user.

3. Build and run the application using `npm run build && npm start`.

Default Administrator:

- Display Name: `Admin`
- Login ID: `admin@rahkar.local`
- Password: `Mirza1993!`

The `db/admin.sql` file stores only the scrypt hash and is designed to be idempotent when executed repeatedly. After logging in, change the password to a custom, secure value.

## Demo Mode

To preview the application without PostgreSQL, run the application with `DEMO_MODE=true` in your `.env` file. Sample data is stored in `.data/demo.json`.

## Implemented Features

- Admin and user dashboards with team workload, request trends, and SLA monitoring
- Creation of Changes, Services, Incidents, and personal tasks
- Team and assignee assignment, configurable workflows, history, comments, and work logs
- Filtering, searching, list and Kanban views, and CSV export
- Management of users, teams, roles, permissions, working calendars, and holidays
- SLA calculation with Thursdays, Fridays, and holidays excluded for SRs and CRs; incidents are calculated continuously
- Data structure for local authentication with future Active Directory integration

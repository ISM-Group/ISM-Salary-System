# Database Setup Scripts

Run in this order:

1. `01_create_schema.sql`
2. `02_seed_sri_lanka_data.sql`

`01_create_schema.sql` is destructive for ISM tables (drops/recreates) and is intended for test environments.
`02_seed_sri_lanka_data.sql` truncates and reseeds app data for test/demo environments.

For an existing empty database where you only need login users, run `03_seed_login_users.sql` instead of the full seed.

Example:

```bash
mysql -u root -p ism_salary < server/src/database/setup/01_create_schema.sql
mysql -u root -p ism_salary < server/src/database/setup/02_seed_sri_lanka_data.sql
```

Login-user-only bootstrap:

```bash
mysql -u root -p ism_salary < server/src/database/setup/03_seed_login_users.sql
```

MySQL Workbench login-user-only bootstrap:

1. Open `03_seed_login_users_workbench.sql` in MySQL Workbench.
2. Confirm the database name in the `USE` line matches your database.
3. Run the whole script.

Or use the Node seed command from the server folder:

```bash
npm run seed:login-users
```

Default seeded login users:

- `admin` / `password` (ADMIN)
- `hrmanager` / `password` (ADMIN)
- `manager1` / `password` (MANAGER)

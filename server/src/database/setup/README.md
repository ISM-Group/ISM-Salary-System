# Database Setup Scripts

Run in this order:

1. `01_create_schema.sql`
2. `02_seed_sri_lanka_data.sql`

`01_create_schema.sql` is destructive for ISM tables (drops/recreates) and is intended for test environments.

Example:

```bash
mysql -u root -p ism_salary < server/src/database/setup/01_create_schema.sql
mysql -u root -p ism_salary < server/src/database/setup/02_seed_sri_lanka_data.sql
```

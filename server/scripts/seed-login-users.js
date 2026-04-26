const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const passwordHash = '$2b$10$Lsno0FoBRGQa/e5bbCvwu.lr9iu9lQqTzXKqzh5u8NulNr5RoNBY2';

const users = [
  ['user-admin-001', 'admin', passwordHash, 'System Administrator', 'ADMIN', true],
  ['user-hr-001', 'hrmanager', passwordHash, 'HR Manager', 'ADMIN', true],
  ['user-mgr-001', 'manager1', passwordHash, 'Manager User', 'MANAGER', true],
];

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DATABASE_PORT || 3306),
    user: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'ism_salary',
  });

  try {
    await connection.execute("SET time_zone = '+05:30'");
    await connection.query(
      `INSERT INTO users (id, username, password_hash, full_name, role, is_active)
       VALUES ?
       ON DUPLICATE KEY UPDATE
         username = VALUES(username),
         password_hash = VALUES(password_hash),
         full_name = VALUES(full_name),
         role = VALUES(role),
         is_active = VALUES(is_active),
         updated_at = CURRENT_TIMESTAMP`,
      [users]
    );

    const [rows] = await connection.query(
      `SELECT username, full_name, role, is_active
       FROM users
       WHERE username IN ('admin', 'hrmanager', 'manager1')
       ORDER BY FIELD(username, 'admin', 'hrmanager', 'manager1')`
    );

    console.table(rows);
    console.log('Seeded login users. Default password for all seeded users: password');
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(`Failed to seed login users: ${error.message}`);
  process.exit(1);
});

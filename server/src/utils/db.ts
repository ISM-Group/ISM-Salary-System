import dotenv from 'dotenv';
import mysql, { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

let pool: Pool | null = null;

const getPool = (): Pool => {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DATABASE_HOST || 'localhost',
      port: Number(process.env.DATABASE_PORT || 3306),
      user: process.env.DATABASE_USER || 'root',
      password: process.env.DATABASE_PASSWORD || '',
      database: process.env.DATABASE_NAME || 'ism_salary',
      connectionLimit: 10,
      waitForConnections: true,
      queueLimit: 0,
      dateStrings: true, // return DATE/DATETIME as 'YYYY-MM-DD' strings, not JS Date objects (avoids UTC timezone shift)
    });
  }
  return pool;
};

export const query = async <T = RowDataPacket>(sql: string, params: unknown[] = []): Promise<T[]> => {
  const [rows] = await getPool().query<RowDataPacket[]>(sql, params);
  return rows as T[];
};

export const queryOne = async <T = RowDataPacket>(
  sql: string,
  params: unknown[] = []
): Promise<T | null> => {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
};

export const execute = async (sql: string, params: unknown[] = []): Promise<ResultSetHeader> => {
  const [result] = await getPool().execute<ResultSetHeader>(sql, params as any[]);
  return result;
};

export const generateId = (): string => uuidv4();

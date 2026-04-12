"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = exports.execute = exports.queryOne = exports.query = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const promise_1 = __importDefault(require("mysql2/promise"));
const uuid_1 = require("uuid");
dotenv_1.default.config();
let pool = null;
const getPool = () => {
    if (!pool) {
        pool = promise_1.default.createPool({
            host: process.env.DATABASE_HOST || 'localhost',
            port: Number(process.env.DATABASE_PORT || 3306),
            user: process.env.DATABASE_USER || 'root',
            password: process.env.DATABASE_PASSWORD || '',
            database: process.env.DATABASE_NAME || 'ism_salary',
            connectionLimit: 10,
            waitForConnections: true,
            queueLimit: 0,
        });
    }
    return pool;
};
const query = async (sql, params = []) => {
    const [rows] = await getPool().query(sql, params);
    return rows;
};
exports.query = query;
const queryOne = async (sql, params = []) => {
    const rows = await (0, exports.query)(sql, params);
    return rows.length > 0 ? rows[0] : null;
};
exports.queryOne = queryOne;
const execute = async (sql, params = []) => {
    const [result] = await getPool().execute(sql, params);
    return result;
};
exports.execute = execute;
const generateId = () => (0, uuid_1.v4)();
exports.generateId = generateId;

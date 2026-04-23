"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.getCurrentUser = exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../utils/db");
const types_1 = require("../types");
const auditLog_1 = require("../utils/auditLog");
/**
 * Signs a JWT token for the given user payload.
 */
const signToken = (user) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT secret is not configured');
    }
    return jsonwebtoken_1.default.sign(user, secret, {
        expiresIn: (process.env.JWT_EXPIRES_IN || '8h'),
    });
};
// PUBLIC_INTERFACE
/**
 * Register a new user.
 * Only ADMIN users can register new accounts.
 * Accepts username, password, fullName, and optional role (ADMIN or MANAGER).
 * Defaults to MANAGER when role is not specified or is invalid.
 *
 * @route POST /api/auth/register
 * @access ADMIN only (enforced via route-level middleware)
 */
const register = async (req, res) => {
    const { username, password, fullName, role } = req.body;
    if (!username || !password || !fullName) {
        res.status(400).json({ error: 'username, password and fullName are required' });
        return;
    }
    if (password.length < 8) {
        res.status(400).json({ error: 'password must be at least 8 characters' });
        return;
    }
    const existing = await (0, db_1.queryOne)('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) {
        res.status(409).json({ error: 'username already exists' });
        return;
    }
    const id = (0, db_1.generateId)();
    const hash = await bcrypt_1.default.hash(password, 10);
    // Default to MANAGER; only allow ADMIN when explicitly specified
    const userRole = role === types_1.UserRole.ADMIN ? types_1.UserRole.ADMIN : types_1.UserRole.MANAGER;
    await (0, db_1.execute)(`INSERT INTO users (id, username, password_hash, full_name, role, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, TRUE, NOW(), NOW())`, [id, username, hash, fullName, userRole]);
    // Write audit log for user registration
    await (0, auditLog_1.writeAuditLog)({
        tableName: 'users',
        action: auditLog_1.AuditAction.CREATE,
        changedBy: req.user?.id,
        recordId: id,
        newData: { username, fullName, role: userRole },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || '',
    });
    const token = signToken({ id, username, full_name: fullName, role: userRole });
    res.status(201).json({
        data: {
            token,
            user: { id, username, full_name: fullName, role: userRole },
        },
    });
};
exports.register = register;
// PUBLIC_INTERFACE
/**
 * Login an existing user.
 * Validates username and password, returns a JWT token on success.
 *
 * @route POST /api/auth/login
 * @access Public
 */
const login = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        res.status(400).json({ error: 'username and password are required' });
        return;
    }
    const user = await (0, db_1.queryOne)(`SELECT id, username, password_hash, full_name, role, is_active
     FROM users WHERE username = ? LIMIT 1`, [username]);
    if (!user || !user.is_active) {
        res.status(401).json({ error: 'invalid credentials' });
        return;
    }
    const isValid = await bcrypt_1.default.compare(password, user.password_hash);
    if (!isValid) {
        res.status(401).json({ error: 'invalid credentials' });
        return;
    }
    const token = signToken({
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
    });
    await (0, auditLog_1.writeAuditLog)({
        tableName: 'users',
        action: auditLog_1.AuditAction.LOGIN,
        changedBy: user.id,
        recordId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || '',
    });
    res.json({
        data: {
            token,
            user: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                role: user.role,
            },
        },
    });
};
exports.login = login;
// PUBLIC_INTERFACE
/**
 * Get the currently authenticated user's information.
 *
 * @route GET /api/auth/me
 * @access Authenticated
 */
const getCurrentUser = async (req, res) => {
    if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    res.json({ data: req.user });
};
exports.getCurrentUser = getCurrentUser;
// PUBLIC_INTERFACE
/**
 * Logout the current user. Writes an audit log entry.
 *
 * @route POST /api/auth/logout
 * @access Authenticated
 */
const logout = async (req, res) => {
    if (req.user) {
        await (0, auditLog_1.writeAuditLog)({
            tableName: 'users',
            action: auditLog_1.AuditAction.LOGOUT,
            changedBy: req.user.id,
            recordId: req.user.id,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || '',
        });
    }
    res.json({ message: 'Logged out successfully' });
};
exports.logout = logout;

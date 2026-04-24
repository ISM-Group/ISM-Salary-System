"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
// Load environment variables
dotenv_1.default.config();
// Import routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const departments_routes_1 = __importDefault(require("./routes/departments.routes"));
const roles_routes_1 = __importDefault(require("./routes/roles.routes"));
const employees_routes_1 = __importDefault(require("./routes/employees.routes"));
const attendance_routes_1 = __importDefault(require("./routes/attendance.routes"));
const loans_routes_1 = __importDefault(require("./routes/loans.routes"));
const advanceSalaries_routes_1 = __importDefault(require("./routes/advanceSalaries.routes"));
const salary_routes_1 = __importDefault(require("./routes/salary.routes"));
const salaryHistory_routes_1 = __importDefault(require("./routes/salaryHistory.routes"));
const holidays_routes_1 = __importDefault(require("./routes/holidays.routes"));
const auditLogs_routes_1 = __importDefault(require("./routes/auditLogs.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
const dailySalaryReleases_routes_1 = __importDefault(require("./routes/dailySalaryReleases.routes"));
const exports_routes_1 = __importDefault(require("./routes/exports.routes"));
const selfService_routes_1 = __importDefault(require("./routes/selfService.routes"));
const app = (0, express_1.default)();
const isProduction = process.env.NODE_ENV === 'production';
// Middleware
// CORS configuration - allow multiple origins for development
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:8080',
    ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : [])
];
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
// Stricter rate limiting for authentication endpoints
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts. Please try again later.' },
});
// General rate limiter for all other endpoints
const generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
});
app.use(generalLimiter);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (like Postman, mobile apps)
        if (!origin) {
            return callback(null, true);
        }
        // In development, allow all origins
        if (!isProduction) {
            return callback(null, true);
        }
        // In production, only allow specific origins
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Type', 'Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
}));
app.use((0, morgan_1.default)(isProduction ? 'combined' : 'dev'));
app.use(express_1.default.json({ limit: '1mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '1mb' }));
app.use((0, cookie_parser_1.default)());
// Serve uploaded files (advance salary slip photos, etc.) as static assets.
// Files are stored by multer disk storage in the <project_root>/uploads directory.
// Accessible at /uploads/<filename>
app.use('/uploads', express_1.default.static(path_1.default.resolve(process.cwd(), 'uploads')));
// Health check with database connectivity check
app.get('/health', async (req, res) => {
    try {
        // Attempt a simple database query to verify connectivity
        const { query } = await Promise.resolve().then(() => __importStar(require('./utils/db')));
        await query('SELECT 1');
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            database: 'connected',
        });
    }
    catch {
        // Database is unreachable but the server itself is running
        res.status(503).json({
            status: 'degraded',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
        });
    }
});
// API Routes - apply stricter rate limiting to auth endpoints
app.use('/api/auth', authLimiter, auth_routes_1.default);
app.use('/api/departments', departments_routes_1.default);
app.use('/api/roles', roles_routes_1.default);
app.use('/api/employees', employees_routes_1.default);
app.use('/api/attendance', attendance_routes_1.default);
app.use('/api/loans', loans_routes_1.default);
app.use('/api/advance-salaries', advanceSalaries_routes_1.default);
app.use('/api/salary', salary_routes_1.default);
app.use('/api/salary-history', salaryHistory_routes_1.default);
app.use('/api/holidays', holidays_routes_1.default);
app.use('/api/audit-logs', auditLogs_routes_1.default);
app.use('/api/dashboard', dashboard_routes_1.default);
app.use('/api/daily-releases', dailySalaryReleases_routes_1.default);
app.use('/api/exports', exports_routes_1.default);
app.use('/api/self-service', selfService_routes_1.default);
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method,
    });
});
// Global error handler with structured error responses
app.use((err, req, res, _next) => {
    console.error('Unhandled error:', err);
    // Handle specific error types
    if (err.message === 'Not allowed by CORS') {
        res.status(403).json({ error: 'CORS: Origin not allowed' });
        return;
    }
    // Handle JSON parse errors
    if (err instanceof SyntaxError && 'body' in err) {
        res.status(400).json({ error: 'Invalid JSON in request body' });
        return;
    }
    // Generic server error - don't leak internal details in production
    const errorResponse = {
        error: 'Internal server error',
    };
    if (!isProduction) {
        errorResponse.message = err.message;
        errorResponse.stack = err.stack;
    }
    res.status(500).json(errorResponse);
});
exports.default = app;

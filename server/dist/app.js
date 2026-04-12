"use strict";
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
app.use((0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
}));
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
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// API Routes
app.use('/api/auth', auth_routes_1.default);
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
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
// Error handler
app.use((err, req, res, _next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
exports.default = app;

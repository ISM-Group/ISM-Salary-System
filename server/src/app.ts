import express, { Application, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import path from 'path';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.routes';
import departmentsRoutes from './routes/departments.routes';
import rolesRoutes from './routes/roles.routes';
import employeesRoutes from './routes/employees.routes';
import attendanceRoutes from './routes/attendance.routes';
import loansRoutes from './routes/loans.routes';
import advanceSalariesRoutes from './routes/advanceSalaries.routes';
import salaryRoutes from './routes/salary.routes';
import salaryHistoryRoutes from './routes/salaryHistory.routes';
import holidaysRoutes from './routes/holidays.routes';
import auditLogsRoutes from './routes/auditLogs.routes';
import dashboardRoutes from './routes/dashboard.routes';
import dailySalaryReleasesRoutes from './routes/dailySalaryReleases.routes';
import exportsRoutes from './routes/exports.routes';
import selfServiceRoutes from './routes/selfService.routes';

const app: Application = express();
const isProduction = process.env.NODE_ENV === 'production';

// Middleware
// CORS configuration - allow multiple origins for development
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:8080',
  ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : [])
];

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Stricter rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.' },
});

// General rate limiter for all other endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

app.use(generalLimiter);

app.use(
  cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
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
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  })
);
app.use(morgan(isProduction ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Serve uploaded files (advance salary slip photos, etc.) as static assets.
// Files are stored by multer disk storage in the <project_root>/uploads directory.
// Accessible at /uploads/<filename>
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// Health check with database connectivity check
app.get('/health', async (req: Request, res: Response) => {
  try {
    // Attempt a simple database query to verify connectivity
    const { query } = await import('./utils/db.js');
    await query('SELECT 1');
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch {
    // Database is unreachable but the server itself is running
    res.status(503).json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    });
  }
});

// API Routes - apply stricter rate limiting to auth endpoints
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/loans', loansRoutes);
app.use('/api/advance-salaries', advanceSalariesRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/salary-history', salaryHistoryRoutes);
app.use('/api/holidays', holidaysRoutes);
app.use('/api/audit-logs', auditLogsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/daily-releases', dailySalaryReleasesRoutes);
app.use('/api/exports', exportsRoutes);
app.use('/api/self-service', selfServiceRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
  });
});

// Global error handler with structured error responses
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
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
  const errorResponse: Record<string, unknown> = {
    error: 'Internal server error',
  };

  if (!isProduction) {
    errorResponse.message = err.message;
    errorResponse.stack = err.stack;
  }

  res.status(500).json(errorResponse);
});

export default app;

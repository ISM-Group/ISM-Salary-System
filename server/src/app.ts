import express, { Application, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import path from 'path';

dotenv.config();

import authRoutes from './routes/auth.routes';
import departmentsRoutes from './routes/departments.routes';
import rolesRoutes from './routes/roles.routes';
import employeesRoutes from './routes/employees.routes';
import attendanceRoutes from './routes/attendance.routes';
import loansRoutes from './routes/loans.routes';
import advanceSalariesRoutes from './routes/advanceSalaries.routes';
import salaryHistoryRoutes from './routes/salaryHistory.routes';
import auditLogsRoutes from './routes/auditLogs.routes';
import dashboardRoutes from './routes/dashboard.routes';
import exportsRoutes from './routes/exports.routes';
import salaryReleasesRoutes from './routes/salaryReleases.routes';
import usersRoutes from './routes/users.routes';

const app: Application = express();
const isProduction = process.env.NODE_ENV === 'production';

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:8080',
  ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
];

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.' },
});

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
      if (!origin) return callback(null, true);
      if (!isProduction) return callback(null, true);
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
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

app.get('/health', async (req: Request, res: Response) => {
  try {
    const { query } = await import('./utils/db.js');
    await query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString(), database: 'connected' });
  } catch {
    res.status(503).json({ status: 'degraded', timestamp: new Date().toISOString(), database: 'disconnected' });
  }
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/loans', loansRoutes);
app.use('/api/advance-salaries', advanceSalariesRoutes);
app.use('/api/salary-history', salaryHistoryRoutes);
app.use('/api/audit-logs', auditLogsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/exports', exportsRoutes);
app.use('/api/salary-releases', salaryReleasesRoutes);
app.use('/api/users', usersRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found', path: req.originalUrl, method: req.method });
});

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);

  if (err.message === 'Not allowed by CORS') {
    res.status(403).json({ error: 'CORS: Origin not allowed' });
    return;
  }

  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: 'Invalid JSON in request body' });
    return;
  }

  const errorResponse: Record<string, unknown> = { error: 'Internal server error' };
  if (!isProduction) {
    errorResponse.message = err.message;
    errorResponse.stack = err.stack;
  }
  res.status(500).json(errorResponse);
});

export default app;

import express, { Application, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';

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

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(
  cors({
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

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
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

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;

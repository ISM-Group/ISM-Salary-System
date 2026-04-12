# ISM-Salary-System - Quick Fix Guide

> **Status update (2026-04-12):** Most items in this quick-fix guide are now implemented in code.  
> Use **`IMPLEMENTATION_UPDATE.md`** for the current state and remaining production tasks.

**Priority**: 🔴 DO THIS NOW  
**Estimated Time**: 2-3 hours to create all template files  
**Impact**: Gets system compiling and running

---

## Step 1: Create Server package.json

**File**: `/server/package.json`

```json
{
  "name": "ism-salary-system-server",
  "version": "1.0.0",
  "description": "ISM Salary Management System - Backend API",
  "main": "dist/server.js",
  "scripts": {
    "dev": "nodemon --exec ts-node src/server.ts",
    "start": "node dist/server.js",
    "build": "tsc",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write \"src/**/*.ts\"",
    "type-check": "tsc --noEmit",
    "migrate:run": "ts-node src/database/migrations/run.ts",
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "keywords": ["salary", "management", "hrm"],
  "author": "ISM Team",
  "license": "ISC",
  "dependencies": {
    "axios": "^1.6.2",
    "bcrypt": "^5.1.1",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "express-rate-limit": "^7.0.0",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.1.2",
    "joi": "^17.11.0",
    "morgan": "^1.10.0",
    "mysql2": "^3.6.5",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/bcrypt": "^5.0.2",
    "@types/cookie-parser": "^1.4.7",
    "@types/cors": "^2.8.17",
    "@types/jest": "^29.5.10",
    "typescript": "^5.3.3",
    "ts-node": "^10.9.2",
    "nodemon": "^3.0.2",
    "eslint": "^8.55.0",
    "@typescript-eslint/eslint-plugin": "^6.13.2",
    "@typescript-eslint/parser": "^6.13.2",
    "prettier": "^3.1.1",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

---

## Step 2: Create Server tsconfig.json

**File**: `/server/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "allowSyntheticDefaultImports": true,
    "moduleResolution": "node",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

---

## Step 3: Create Server .env.example

**File**: `/server/.env.example`

```env
# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=
DATABASE_NAME=ism_salary

# Server Configuration
PORT=5001
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_change_in_production
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_change_in_production
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# CORS Configuration
CLIENT_URL=http://localhost:3000
PRODUCTION_CLIENT_URL=https://app.example.com

# Logging
LOG_LEVEL=debug

# Email Configuration (for notifications)
EMAIL_SERVICE=gmail
EMAIL_USER=noreply@ismsalary.com
EMAIL_PASSWORD=

# Audit Configuration
ENABLE_AUDIT_LOGS=true
AUDIT_LOG_RETENTION_DAYS=90

# Security
BCRYPT_ROUNDS=10
```

---

## Step 4: Create Server Entry Point

**File**: `/server/src/server.ts`

```typescript
import dotenv from 'dotenv';
import http from 'http';
import app from './app';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5001;
const NODE_ENV = process.env.NODE_ENV || 'development';

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`${NODE_ENV} Environment`);
  console.log(`✓ Server listening on port ${PORT}`);
  console.log(`✓ API Base URL: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
```

---

## Step 5: Create Client package.json

**File**: `/client/package.json`

```json
{
  "name": "ism-salary-system-client",
  "version": "1.0.0",
  "description": "ISM Salary Management System - Frontend UI",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext .ts,.tsx",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\"",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.28.0",
    "axios": "^1.6.2",
    "clsx": "^2.0.0",
    "lucide-react": "^0.292.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^7.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@typescript-eslint/eslint-plugin": "^6.13.2",
    "@typescript-eslint/parser": "^6.13.2",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.16",
    "eslint": "^8.55.0",
    "postcss": "^8.4.32",
    "prettier": "^3.1.1",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.3",
    "vite": "^5.0.8"
  }
}
```

---

## Step 6: Create Client tsconfig.json

**File**: `/client/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "esModuleInterop": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

## Step 7: Create Client tsconfig.node.json

**File**: `/client/tsconfig.node.json`

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

---

## Step 8: Create Client vite.config.ts

**File**: `/client/vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
  },
});
```

---

## Step 9: Create Client .env.example

**File**: `/client/.env.example`

```env
# API Configuration
VITE_API_URL=http://localhost:5001/api
VITE_APP_NAME=ISM Salary System

# Build Configuration
VITE_ENV=development
```

---

## Step 10: Create Client main.tsx

**File**: `/client/src/main.tsx`

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
```

---

## Step 11: Create Client index.html

**File**: `/client/index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ISM Salary System</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## Step 12: Create Client .env.local (for development)

**File**: `/client/.env.local`

```env
VITE_API_URL=http://localhost:5001/api
```

---

## Step 13: Create Server .env.local (for development)

**File**: `/server/.env.local`

```env
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=
DATABASE_NAME=ism_salary
PORT=5001
NODE_ENV=development
JWT_SECRET=dev_secret_key
JWT_REFRESH_SECRET=dev_refresh_secret
CLIENT_URL=http://localhost:3000
```

---

## Installation Steps

### 1. Install Server Dependencies
```bash
cd /Volumes/Sasindu/Github/Sasindu/ISM-Salary-System/server
npm install
```

### 2. Install Client Dependencies
```bash
cd /Volumes/Sasindu/Github/Sasindu/ISM-Salary-System/client
npm install
```

### 3. Set Up Database
```bash
# Make sure MySQL is running
mysql -u root < server/RUN_IN_MYSQL_WORKBENCH.sql
mysql -u root < server/UPDATE_TO_DAILY_WAGE.sql
```

### 4. Start Server
```bash
cd server
npm run dev
# Server running on http://localhost:5001
```

### 5. Start Client (in new terminal)
```bash
cd client
npm run dev
# Client running on http://localhost:3000
```

---

## Still Missing - High Priority

After installing packages, you'll still need to create:

1. **Authentication System**
   - `server/src/utils/db.ts` - Database connection
   - `server/src/types/index.ts` - TypeScript types
   - `server/src/middleware/auth.middleware.ts`
   - `server/src/controllers/auth.controller.ts`

2. **All Missing Controllers and Routes** (~10 more files)

3. **UI Components** (~15 component files)

4. **Auth Context** for React

---

## Checklist for Immediate Action

- [ ] Create all 13 files above
- [ ] Run `npm install` in both directories
- [ ] Verify no install errors
- [ ] Test `npm run build` in both directories
- [ ] Test `npm run dev` in server
- [ ] Test `npm run dev` in client
- [ ] Open http://localhost:3000 in browser
- [ ] Verify TypeScript compilation errors

**If all above passes**: You're ready to start implementing missing features

---

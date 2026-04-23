"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Auth Routes
 *
 * Handles user authentication and registration.
 * - POST /register  — Create a new user (ADMIN only)
 * - POST /login     — Login and receive JWT token
 * - GET  /me        — Get current authenticated user
 * - POST /logout    — Logout current user
 */
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const types_1 = require("../types");
const router = (0, express_1.Router)();
// Register requires ADMIN authentication — only admins can create new users
router.post('/register', auth_middleware_1.authenticate, (0, rbac_middleware_1.authorize)(types_1.UserRole.ADMIN), auth_controller_1.register);
router.post('/login', auth_controller_1.login);
router.get('/me', auth_middleware_1.authenticate, auth_controller_1.getCurrentUser);
router.post('/logout', auth_middleware_1.authenticate, auth_controller_1.logout);
exports.default = router;

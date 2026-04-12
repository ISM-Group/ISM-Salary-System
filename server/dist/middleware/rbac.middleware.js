"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = void 0;
const authorize = (...roles) => (req, res, next) => {
    if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    if (!roles.includes(req.user.role)) {
        res.status(403).json({ error: 'Forbidden' });
        return;
    }
    next();
};
exports.authorize = authorize;

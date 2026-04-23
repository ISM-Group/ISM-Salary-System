"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRole = void 0;
/**
 * UserRole defines the two system-level roles for the ISM Salary System.
 * - ADMIN: Full access — can approve, edit, delete, and view audit logs.
 * - MANAGER: Data-entry access — can create records, view data, but cannot
 *   approve, release, edit/delete employees, or view audit logs.
 */
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "ADMIN";
    UserRole["MANAGER"] = "MANAGER";
})(UserRole || (exports.UserRole = UserRole = {}));

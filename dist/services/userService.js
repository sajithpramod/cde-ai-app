"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserByEmail = getUserByEmail;
exports.getUserById = getUserById;
exports.createUserIfNotExists = createUserIfNotExists;
exports.findOrCreateUser = findOrCreateUser;
exports.updateUserRole = updateUserRole;
exports.checkPermission = checkPermission;
const db_1 = __importDefault(require("./db"));
const debugLogger_1 = require("../utils/debugLogger");
const log = (0, debugLogger_1.createModuleLogger)('userService');
async function getUserByEmail(email) {
    const user = await (0, db_1.default)('users').where({ email }).first();
    return user || null;
}
async function getUserById(userId) {
    const user = await (0, db_1.default)('users')
        .where({ id: userId })
        .first();
    return user || null;
}
async function createUserIfNotExists(email, profile) {
    const existing = await getUserByEmail(email);
    if (existing) {
        await (0, db_1.default)('users')
            .where({ id: existing.id })
            .update({ last_login: db_1.default.fn.now() });
        return existing;
    }
    const newUser = {
        email,
        name: profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || 'SSO User',
        role: 'user',
        created_at: new Date(),
        updated_at: new Date(),
        last_login: new Date()
    };
    const [createdUser] = await (0, db_1.default)('users').insert(newUser).returning('*');
    return createdUser;
}
async function findOrCreateUser(azureUser) {
    const { email, name, azureId } = azureUser;
    try {
        if (azureId) {
            let user = await (0, db_1.default)('users')
                .where({ azure_id: azureId })
                .first();
            if (user) {
                await (0, db_1.default)('users')
                    .where({ id: user.id })
                    .update({
                    last_login: db_1.default.fn.now(),
                    name: name,
                    email: email
                });
                return user;
            }
        }
        let user = await getUserByEmail(email);
        if (user) {
            const updateData = {
                last_login: db_1.default.fn.now(),
                name: name
            };
            if (azureId) {
                updateData.azure_id = azureId;
            }
            await (0, db_1.default)('users')
                .where({ id: user.id })
                .update(updateData);
            return user;
        }
        const newUserData = {
            email: email,
            name: name,
            role: 'user',
            created_at: db_1.default.fn.now(),
            updated_at: db_1.default.fn.now(),
            last_login: db_1.default.fn.now()
        };
        if (azureId) {
            newUserData.azure_id = azureId;
        }
        const [newUser] = await (0, db_1.default)('users')
            .insert(newUserData)
            .returning('*');
        log.debug(`New user created: ${email}`);
        return newUser;
    }
    catch (error) {
        log.error('Error in findOrCreateUser:', error);
        throw error;
    }
}
async function updateUserRole(userId, role) {
    const allowedRoles = ['admin', 'user', 'viewer'];
    if (!allowedRoles.includes(role)) {
        throw new Error(`Invalid role. Allowed roles: ${allowedRoles.join(', ')}`);
    }
    const [updatedUser] = await (0, db_1.default)('users')
        .where({ id: userId })
        .update({
        role: role,
        updated_at: db_1.default.fn.now()
    })
        .returning('*');
    return updatedUser;
}
async function checkPermission(userId, action, resource, resourceOwnerId = null) {
    const user = await getUserById(userId);
    if (!user) {
        return false;
    }
    if (user.role === 'admin') {
        return true;
    }
    if (action === 'view' && resource === 'report') {
        return true;
    }
    if ((action === 'edit' || action === 'delete') && resource === 'forecast') {
        return userId === resourceOwnerId;
    }
    if (user.role === 'viewer' && action === 'view') {
        return true;
    }
    return false;
}
exports.default = {
    getUserByEmail,
    getUserById,
    createUserIfNotExists,
    findOrCreateUser,
    updateUserRole,
    checkPermission
};
//# sourceMappingURL=userService.js.map
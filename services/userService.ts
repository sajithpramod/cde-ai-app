// User Service for managing user accounts and SSO integration
// TypeScript Version - Demonstrates use of types/index.ts interfaces

import db from './db';
import { createModuleLogger } from '../utils/debugLogger';
import { User, AzureUser, SamlProfile } from '../types';

const log: any = createModuleLogger('userService');

/**
 * Get a user by email
 * Uses the User interface from types/index.ts
 */
export async function getUserByEmail(email: string): Promise<User | null> {
    const user = await db('users').where({ email }).first();
    return user || null;
}

/**
 * Get user by ID
 * Returns User interface type
 */
export async function getUserById(userId: number): Promise<User | null> {
    const user = await db('users')
        .where({ id: userId })
        .first();
    return user || null;
}

/**
 * Create a user if they don't exist already (SAML compatibility)
 * Uses SamlProfile interface from types/index.ts
 */
export async function createUserIfNotExists(
    email: string,
    profile: SamlProfile
): Promise<User> {
    const existing = await getUserByEmail(email);

    if (existing) {
        // Update last login
        await db('users')
            .where({ id: existing.id })
            .update({ last_login: db.fn.now() });
        return existing;
    }

    // Create new user with proper typing
    const newUser: Partial<User> = {
        email,
        name: profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || 'SSO User',
        role: 'user',
        created_at: new Date(),
        updated_at: new Date(),
        last_login: new Date()
    };

    const [createdUser] = await db('users').insert(newUser).returning('*');
    return createdUser as User;
}

/**
 * Find or create a user from Azure AD authentication
 * Uses AzureUser interface from types/index.ts
 */
export async function findOrCreateUser(azureUser: AzureUser): Promise<User> {
    const { email, name, azureId } = azureUser;

    try {
        // First, try to find user by Azure ID if provided
        if (azureId) {
            let user: User | null = await db('users')
                .where({ azure_id: azureId })
                .first();

            if (user) {
                // Update last login timestamp
                await db('users')
                    .where({ id: user.id })
                    .update({
                        last_login: db.fn.now(),
                        name: name,
                        email: email
                    });

                return user;
            }
        }

        // If not found by Azure ID, try to find by email (existing user)
        let user = await getUserByEmail(email);

        if (user) {
            // Link existing user to Azure AD account if azureId provided
            const updateData: any = {
                last_login: db.fn.now(),
                name: name
            };

            if (azureId) {
                updateData.azure_id = azureId;
            }

            await db('users')
                .where({ id: user.id })
                .update(updateData);

            return user;
        }

        // User doesn't exist - create new user
        const newUserData: any = {
            email: email,
            name: name,
            role: 'user',
            created_at: db.fn.now(),
            updated_at: db.fn.now(),
            last_login: db.fn.now()
        };

        if (azureId) {
            newUserData.azure_id = azureId;
        }

        const [newUser] = await db('users')
            .insert(newUserData)
            .returning('*');

        log.debug(`New user created: ${email}`);

        return newUser as User;

    } catch (error) {
        log.error('Error in findOrCreateUser:', error);
        throw error;
    }
}

/**
 * Update user role (admin function)
 * Uses User interface role type (admin | user | viewer)
 */
export async function updateUserRole(
    userId: number,
    role: 'admin' | 'user' | 'viewer'
): Promise<User> {
    const allowedRoles: Array<'admin' | 'user' | 'viewer'> = ['admin', 'user', 'viewer'];

    if (!allowedRoles.includes(role)) {
        throw new Error(`Invalid role. Allowed roles: ${allowedRoles.join(', ')}`);
    }

    const [updatedUser] = await db('users')
        .where({ id: userId })
        .update({
            role: role,
            updated_at: db.fn.now()
        })
        .returning('*');

    return updatedUser as User;
}

/**
 * Check if user has permission for a resource
 * Demonstrates type-safe permission checking
 */
export async function checkPermission(
    userId: number,
    action: 'view' | 'edit' | 'delete',
    resource: 'forecast' | 'report',
    resourceOwnerId: number | null = null
): Promise<boolean> {
    const user = await getUserById(userId);

    if (!user) {
        return false;
    }

    // Admins have all permissions
    if (user.role === 'admin') {
        return true;
    }

    // Users can view all reports
    if (action === 'view' && resource === 'report') {
        return true;
    }

    // Users can only edit/delete their own forecasts
    if ((action === 'edit' || action === 'delete') && resource === 'forecast') {
        return userId === resourceOwnerId;
    }

    // Viewers can only view
    if (user.role === 'viewer' && action === 'view') {
        return true;
    }

    return false;
}

// Export all functions
export default {
    getUserByEmail,
    getUserById,
    createUserIfNotExists,
    findOrCreateUser,
    updateUserRole,
    checkPermission
};

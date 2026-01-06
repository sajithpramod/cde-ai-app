import { User, AzureUser, SamlProfile } from '../types';
export declare function getUserByEmail(email: string): Promise<User | null>;
export declare function getUserById(userId: number): Promise<User | null>;
export declare function createUserIfNotExists(email: string, profile: SamlProfile): Promise<User>;
export declare function findOrCreateUser(azureUser: AzureUser): Promise<User>;
export declare function updateUserRole(userId: number, role: 'admin' | 'user' | 'viewer'): Promise<User>;
export declare function checkPermission(userId: number, action: 'view' | 'edit' | 'delete', resource: 'forecast' | 'report', resourceOwnerId?: number | null): Promise<boolean>;
declare const _default: {
    getUserByEmail: typeof getUserByEmail;
    getUserById: typeof getUserById;
    createUserIfNotExists: typeof createUserIfNotExists;
    findOrCreateUser: typeof findOrCreateUser;
    updateUserRole: typeof updateUserRole;
    checkPermission: typeof checkPermission;
};
export default _default;
//# sourceMappingURL=userService.d.ts.map
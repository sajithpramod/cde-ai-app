/**
 * Custom Express type augmentations
 * This file extends Express types with custom properties used throughout the application
 */

import { User } from './index';

declare global {
    namespace Express {
        // Augment the User interface (used by passport)
        interface User {
            id?: number;
            email: string;
            name?: string;
            role?: 'admin' | 'user' | 'viewer';
            azure_id?: string;
            created_at?: Date;
            updated_at?: Date;
            last_login?: Date;
            [key: string]: unknown;
        }

        // Augment the Request interface with custom properties
        interface Request {
            // File upload properties (from validateAndStoreDynamic middleware)
            uploadDuration?: number;
            validatedFilePath?: string;
            validatedFieldName?: string;
            fileName?: string;
            fieldName?: string;
            dataType?: string;
        }
    }
}

export {};

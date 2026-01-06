/**
 * Ambient module declarations for third-party libraries without type definitions
 * Add declarations here for any npm packages that don't have @types packages
 */

// Example: If a library doesn't have types, declare it here
// declare module 'some-library-without-types' {
//     export function someFunction(arg: string): void;
//     export default class SomeClass {
//         constructor(options: unknown);
//     }
// }

// Utility type for JSON values
type JSONValue =
    | string
    | number
    | boolean
    | null
    | JSONObject
    | JSONArray;

interface JSONObject {
    [key: string]: JSONValue;
}

interface JSONArray extends Array<JSONValue> {}

// Extend global namespace
declare global {
    // Add any global type augmentations here

    // Utility type for async function return types
    type AsyncReturnType<T extends (...args: any) => Promise<any>> =
        T extends (...args: any) => Promise<infer R> ? R : any;

    // Utility type for making properties optional
    type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

    // Utility type for making properties required
    type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

    // Utility type for creating a type-safe keys array
    type KeysOfType<T, V> = {
        [K in keyof T]: T[K] extends V ? K : never;
    }[keyof T];
}

export {};

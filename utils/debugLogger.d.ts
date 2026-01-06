// Type definitions for debugLogger module

import { Logger } from 'winston';

/**
 * Module logger interface with all logging methods
 */
export interface ModuleLogger {
    trace(message: string, ...args: any[]): void;
    debug(message: string, ...args: any[]): void;
    verbose(message: string, ...args: any[]): void;
    http(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
    object(label: string, obj: any): void;
    auto(message: string, ...args: any[]): void;
}

/**
 * Performance timer for measuring execution time
 */
export interface PerfTimer {
    label: string;
    end(): number;
}

/**
 * Caller information from stack trace
 */
export interface CallerInfo {
    module: string;
    function: string;
    line: number;
}

/**
 * Create a namespaced debug logger for a specific module
 */
export function createModuleLogger(moduleName: string): ModuleLogger;

/**
 * Quick debug function - auto-detects caller location
 */
export function debug(message: string, ...args: any[]): void;

/**
 * Quick trace function - for very detailed debugging
 */
export function trace(message: string, ...args: any[]): void;

/**
 * Log function entry
 */
export function entering(functionName: string, ...args: any[]): void;

/**
 * Log function exit
 */
export function exiting(functionName: string, returnValue?: any): void;

/**
 * Log a divider for visual separation in logs
 */
export function divider(label?: string): void;

/**
 * Start a performance timer
 */
export function startTimer(label: string): PerfTimer;

/**
 * Measure execution time of a function
 */
export function measureTime<T>(label: string, fn: () => T | Promise<T>): Promise<T>;

/**
 * Log HTTP request details
 */
export function logRequest(req: any, additionalInfo?: Record<string, any>): void;

/**
 * Log HTTP response details
 */
export function logResponse(req: any, res: any, additionalInfo?: Record<string, any>): void;

/**
 * Conditional debug - only logs if condition is true
 */
export function debugIf(condition: boolean, message: string, ...args: any[]): void;

/**
 * Debug once - only logs the first time it's called for a specific key
 */
export function debugOnce(key: string, message: string, ...args: any[]): void;

/**
 * Convenience info function
 */
export function info(msg: string, ...args: any[]): void;

/**
 * Convenience warn function
 */
export function warn(msg: string, ...args: any[]): void;

/**
 * Convenience error function
 */
export function error(msg: string, ...args: any[]): void;

/**
 * Base winston logger instance
 */
export const logger: Logger;

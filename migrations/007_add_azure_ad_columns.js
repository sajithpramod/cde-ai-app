/**
 * Migration: Add Azure AD support columns to users table
 * This migration adds columns needed for Azure AD integration
 */

exports.up = function(knex) {
    return knex.schema.table('users', function(table) {
        // Azure AD unique identifier
        table.string('azure_id').unique().nullable();

        // Track last login for security auditing
        table.timestamp('last_login').nullable();

        // Add index for faster lookups
        table.index('azure_id');
        table.index('last_login');
    });
};

exports.down = function(knex) {
    return knex.schema.table('users', function(table) {
        table.dropColumn('azure_id');
        table.dropColumn('last_login');
    });
};

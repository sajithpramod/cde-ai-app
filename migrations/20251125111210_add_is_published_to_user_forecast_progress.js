/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    await knex.schema.table('user_forecast_progress', (table) => {
        table.boolean('is_published').defaultTo(false);
        table.string('blob_storage_path', 500);
        table.timestamp('published_at', { useTz: true });
    });

    // Create index on is_published for better query performance
    await knex.schema.alterTable('user_forecast_progress', (table) => {
        table.index(['is_published'], 'idx_user_forecast_progress_is_published');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    await knex.schema.table('user_forecast_progress', (table) => {
        table.dropIndex(['is_published'], 'idx_user_forecast_progress_is_published');
        table.dropColumn('is_published');
        table.dropColumn('blob_storage_path');
        table.dropColumn('published_at');
    });
};

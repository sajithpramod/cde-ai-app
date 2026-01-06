/**
 * @param {import('knex')} knex
 */

exports.up = async function (knex) {
    await knex.schema.createTable('user_forecast_progress', (table) => {
        table.increments('id').primary(); // Primary key
  
        table
            .integer('user_id')
            .notNullable()
            .references('id')
            .inTable('users')
            .onDelete('CASCADE');
  
        table.string('session_id', 255);
        table.string('data_type', 100).notNullable();
        table.string('field_name', 100);
        table.jsonb('country_selection');
        table.jsonb('form_data');
        table.jsonb('uploaded_files');
        table.boolean('is_complete').defaultTo(false);
        table.string('last_step', 100);
        table
            .timestamp('last_updated_at', { useTz: true })
            .defaultTo(knex.fn.now());
        table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  
        // Indexes
        table.unique(['user_id']);
        table.index(['is_complete'], 'idx_user_forecast_progress_is_complete');
        table.index(['user_id'], 'idx_user_forecast_progress_user_id');
    });
};
  
exports.down = async function (knex) {
    await knex.schema.dropTableIfExists('user_forecast_progress');
};
  
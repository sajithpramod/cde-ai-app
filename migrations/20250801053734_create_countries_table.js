/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('countries', function(table) {
        table.increments('id').primary(); // Auto-increment ID
        table.string('cluster_name').notNullable();
        table.string('country_name').notNullable().unique(); // assuming country names are unique
        table.timestamps(true, true); // created_at and updated_at
    });
};
  
exports.down = function(knex) {
    return knex.schema.dropTableIfExists('countries');
};
  

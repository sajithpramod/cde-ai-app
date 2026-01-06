/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.table('markets', function(table) {
      table.string('model_type').defaultTo('default'); // or table.integer(...), etc.
    });
  };
  
  exports.down = function(knex) {
    return knex.schema.table('markets', function(table) {
      table.dropColumn('model_type');
    });
  };

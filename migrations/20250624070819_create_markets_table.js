exports.up = function(knex) {
    return knex.schema.createTable('markets', function(table) {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('market_type'); // e.g., 'cluster', 'region', etc.
      table.timestamps(true, true);
    });
  };
  
  exports.down = function(knex) {
    return knex.schema.dropTable('markets');
  };
  
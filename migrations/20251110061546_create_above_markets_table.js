/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
    await knex.schema.createTable('above_markets', (table) => {
        table.increments('id').primary();
        table.string('market_type').notNullable(); // e.g. FP&A or MGF
        table.string('market_name').notNullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
        table.unique(['market_type', 'market_name']); // prevent duplicates
    });
}
  
export async function down(knex) {
    await knex.schema.dropTableIfExists('above_markets');
}
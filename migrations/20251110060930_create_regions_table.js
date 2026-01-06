/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
    await knex.schema.createTable('regions', (table) => {
        table.increments('id').primary();
        table.string('name').notNullable().unique();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
}
  
export async function down(knex) {
    await knex.schema.dropTableIfExists('regions');
}
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.table('countries', function (table) {
        table.boolean('is_cluster_country').defaultTo(false).nullable();
        table.string('bgs_adhoc').nullable();
        table.string('ddh_iwsr').nullable();
        table.string('ddh_retail').nullable();
        table.string('foresights').nullable();
        table.string('kantar').nullable();
        table.specificType('mapped_ddh_iwsr', 'jsonb').nullable(); // Store an array of strings
        table.specificType('mapped_ddh_retails', 'jsonb').nullable(); // Store an array of strings
        table.specificType('mapped_forsight', 'jsonb').nullable(); // Store an array of strings
        table.specificType('mapped_kantar', 'jsonb').nullable(); // Store an array of strings
    });
};
  
exports.down = function (knex) {
    return knex.schema.table('countries', function (table) {
        table.dropColumn('bgs_adhoc');
        table.dropColumn('ddh_iwsr');
        table.dropColumn('ddh_retail');
        table.dropColumn('foresights');
        table.dropColumn('kantar');
        table.dropColumn('is_cluster_country');
        table.dropColumn('mapped_ddh_iwsr');
        table.dropColumn('mapped_ddh_retails');
        table.dropColumn('mapped_forsight');
        table.dropColumn('mapped_kantar')
    });
};
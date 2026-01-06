import { name } from "ejs";

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
export async function seed(knex) {
    // Deletes ALL existing entries
    await knex('regions').del();

    // Insert unique regions
    await knex('regions').insert([
        { name: 'Africa' },
        { name: 'LAC (ex. GT)' },
        { name: 'India' },
        { name: 'ET' },
        { name: 'APAC (ex. India)'},
        { name: 'NAM'}

    ]);
}

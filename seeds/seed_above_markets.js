/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
// seeds/20251110131000_seed_above_markets.js

export async function seed(knex) {
    // Clear existing records
    await knex('above_markets').del();

    const mgfMarkets = [
        'MENA',
        'Eastern Europe',
        'AEM',
        'CCA',
        'South LAC',
        'Australia',
        'Aust/Switz',
        'Belg/Neth',
        'Brazil',
        'South East Asia',
        'Canada',
        'Spain',
        'Greater China',
        'Colombia',
        'Scandinavia',
        'France',
        'Germany',
        'Greece',
        'India',
        'Ireland',
        'Italy',
        'Japan',
        'East Africa',
        'Mexico',
        'Nigeria',
        'Poland',
        'Portugal',
        'South Africa',
        'Korea',
        'Türkiye',
        'GB',
        'USA',
    ];

    const fpaMarkets = [
        'MENA',
        'Eastern Europe',
        'SWC Africa',
        'CCV',
        'South LAC',
        'Australia',
        'DACH',
        'Benelux and Nordics',
        'Southern Europe',
        'Brazil',
        'SEA',
        'NAM',
        'Iberia',
        'Greater China',
        'Colombia',
        'Greece',
        'India',
        'Ireland',
        'Japan',
        'East Africa',
        'Mexico',
        'Nigeria',
        'Poland',
        'Korea',
        'Türkiye',
        'GB',
    ];

    const records = [
        ...fpaMarkets.map((name) => ({ market_type: 'FP&A', market_name: name })),
        ...mgfMarkets.map((name) => ({ market_type: 'MGF', market_name: name })),
    ];

    console.log(records);
    await knex('above_markets').insert(records);
}

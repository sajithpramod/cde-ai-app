exports.seed = async function (knex) {
    // Clear existing data
    await knex('markets').del();
  
    // Insert updated seed data
    await knex('markets').insert([
        { name: 'Australia', market_type: 'Country', model_type: 'FPA' },
        { name: 'Brazil', market_type: 'Country', model_type: 'FPA' },
        { name: 'Benelux and Nordics', market_type: 'CM', model_type: 'FPA' },
        { name: 'CCV', market_type: 'CM', model_type: 'FPA' },
        { name: 'Colombia', market_type: 'Country', model_type: 'FPA' },
        { name: 'DACH', market_type: 'CM', model_type: 'FPA' },
        { name: 'East Africa', market_type: 'CM', model_type: 'FPA' },
        { name: 'Eastern Europe', market_type: 'CM', model_type: 'FPA' },
        { name: 'GB', market_type: 'Country', model_type: 'FPA' },
        // Missing name case intentionally removed
        { name: 'Greater China', market_type: 'CM', model_type: 'FPA' },
        { name: 'Greece', market_type: 'Country', model_type: 'FPA' },
        { name: 'Iberia', market_type: 'CM', model_type: 'FPA' },
        { name: 'India', market_type: 'Country', model_type: 'FPA' },
        { name: 'Ireland', market_type: 'CM', model_type: 'FPA' },
        { name: 'Japan', market_type: 'Country', model_type: 'FPA' },
        { name: 'Korea', market_type: 'Country', model_type: 'FPA' },
        { name: 'MENA', market_type: 'CM', model_type: 'FPA' },
        { name: 'Mexico', market_type: 'Country', model_type: 'FPA' },
        { name: 'NAM', market_type: 'CM', model_type: 'FPA' },
        { name: 'Nigeria', market_type: 'Country', model_type: 'FPA' },
        { name: 'Poland', market_type: 'Country', model_type: 'FPA' },
        { name: 'Poland', market_type: 'CM', model_type: 'FPA' },
        { name: 'SEA', market_type: 'CM', model_type: 'FPA' },
        { name: 'South LAC', market_type: 'CM', model_type: 'FPA' },
        { name: 'Southern Europe', market_type: 'CM', model_type: 'FPA' },
        { name: 'SWC Africa', market_type: 'CM', model_type: 'FPA' },
        { name: 'Turkiye', market_type: 'Country', model_type: 'FPA' }
    ]);
};
  
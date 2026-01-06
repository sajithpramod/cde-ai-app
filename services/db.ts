// Knex database instance
import knex, { Knex } from 'knex';
import * as knexConfig from '../knexfile';

// Select environment (default to development)
const environment = (process.env.NODE_ENV || 'development') as keyof typeof knexConfig;
const db: Knex = knex(knexConfig[environment]);

export default db;

/**
 * Migration Template:
 * Modify user_forecast_progress uniqueness rule
 * - Drop old unique constraint (user_id)
 * - Add a partial unique index allowing only one incomplete record per user
 */

exports.up = async function (knex) {
    console.log('🔼 Running migration: add partial unique index on user_forecast_progress');
  
    // Step 1: Drop old constraint if it exists
    await knex.schema.raw(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'user_forecast_progress_user_id_unique'
        ) THEN
          ALTER TABLE user_forecast_progress
          DROP CONSTRAINT user_forecast_progress_user_id_unique;
        END IF;
      END$$;
    `);
  
    // Step 2: Add partial unique index (only one incomplete record per user)
    await knex.schema.raw(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_incomplete_progress
      ON user_forecast_progress(user_id)
      WHERE is_complete = false;
    `);
  
    console.log('✅ Partial unique index created successfully.');
};
  
exports.down = async function (knex) {
    console.log('🔽 Reverting migration: remove partial unique index on user_forecast_progress');
  
    // Step 1: Drop the partial unique index
    await knex.schema.raw(`
      DROP INDEX IF EXISTS uniq_user_incomplete_progress;
    `);
  
    // Step 2: Restore the original unique constraint if needed
    await knex.schema.raw(`
      ALTER TABLE user_forecast_progress
      ADD CONSTRAINT user_forecast_progress_user_id_unique UNIQUE (user_id);
    `);
  
    console.log('✅ Reverted to original unique constraint.');
};
  
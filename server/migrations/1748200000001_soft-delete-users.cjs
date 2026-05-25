/* eslint-disable camelcase */

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP;

    -- Soft delete: a removed user keeps their authored records (created_by,
    -- shop_manager_id on transactions) for audit, but frees their email so a
    -- new account can reuse it.
    ALTER TABLE users DROP CONSTRAINT users_email_key;
    CREATE UNIQUE INDEX users_email_active_key
      ON users (email) WHERE deleted_at IS NULL;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX users_email_active_key;
    ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
    ALTER TABLE users DROP COLUMN deleted_at;
  `);
};

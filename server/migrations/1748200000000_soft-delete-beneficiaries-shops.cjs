/* eslint-disable camelcase */

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE beneficiaries ADD COLUMN deleted_at TIMESTAMP;
    ALTER TABLE shops          ADD COLUMN deleted_at TIMESTAMP;

    -- Soft delete: a deleted row keeps its transaction history but must stop
    -- holding the phone_number slot, so the same household can be
    -- re-registered later. Swap the table-wide unique constraint for a partial
    -- unique index scoped to live (non-deleted) rows.
    -- qr_code keeps its global unique constraint — values are random UUIDs, so
    -- a retired code never collides with a freshly generated one.
    ALTER TABLE beneficiaries DROP CONSTRAINT beneficiaries_phone_number_key;
    CREATE UNIQUE INDEX beneficiaries_phone_number_active_key
      ON beneficiaries (phone_number) WHERE deleted_at IS NULL;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX beneficiaries_phone_number_active_key;
    ALTER TABLE beneficiaries
      ADD CONSTRAINT beneficiaries_phone_number_key UNIQUE (phone_number);
    ALTER TABLE shops         DROP COLUMN deleted_at;
    ALTER TABLE beneficiaries DROP COLUMN deleted_at;
  `);
};

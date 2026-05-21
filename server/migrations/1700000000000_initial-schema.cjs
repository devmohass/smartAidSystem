/* eslint-disable camelcase */

exports.up = (pgm) => {
  pgm.sql(`
    -- USERS
    CREATE TABLE users (
      id            SERIAL PRIMARY KEY,
      name          VARCHAR(255) NOT NULL,
      email         VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role          VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'shop_manager', 'donor')),
      created_at    TIMESTAMP DEFAULT NOW()
    );

    -- SHOPS
    CREATE TABLE shops (
      id         SERIAL PRIMARY KEY,
      name       VARCHAR(255) NOT NULL,
      location   VARCHAR(255),
      owner_name VARCHAR(255),
      created_by INT REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- SHOP_MANAGERS (join: user <-> shop)
    CREATE TABLE shop_managers (
      id      SERIAL PRIMARY KEY,
      user_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      shop_id INT REFERENCES shops(id) ON DELETE CASCADE
    );

    -- BENEFICIARIES
    CREATE TABLE beneficiaries (
      id                SERIAL PRIMARY KEY,
      name              VARCHAR(255) NOT NULL,
      phone_number      VARCHAR(50) UNIQUE NOT NULL,
      qr_code           VARCHAR(100) UNIQUE NOT NULL,
      profile_image_url VARCHAR(500),
      family_size       INT,
      location          VARCHAR(255),
      created_by        INT REFERENCES users(id),
      created_at        TIMESTAMP DEFAULT NOW()
    );

    -- CAMPAIGNS
    CREATE TABLE campaigns (
      id         SERIAL PRIMARY KEY,
      title      VARCHAR(255) NOT NULL,
      location   VARCHAR(255),
      start_date DATE NOT NULL,
      end_date   DATE NOT NULL,
      budget     DECIMAL(12, 2) NOT NULL,
      status     VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
      created_by INT REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- CAMPAIGN_BENEFICIARIES (enrolment + per-campaign balance)
    CREATE TABLE campaign_beneficiaries (
      id                SERIAL PRIMARY KEY,
      campaign_id       INT REFERENCES campaigns(id) ON DELETE CASCADE,
      beneficiary_id    INT REFERENCES beneficiaries(id) ON DELETE CASCADE,
      allocated_balance DECIMAL(10, 2) NOT NULL,
      remaining_balance DECIMAL(10, 2) NOT NULL,
      enrolled_at       TIMESTAMP DEFAULT NOW(),
      UNIQUE (campaign_id, beneficiary_id)
    );

    -- TRANSACTIONS (redemption events)
    CREATE TABLE transactions (
      id                SERIAL PRIMARY KEY,
      campaign_id       INT REFERENCES campaigns(id),
      beneficiary_id    INT REFERENCES beneficiaries(id),
      shop_id           INT REFERENCES shops(id),
      shop_manager_id   INT REFERENCES users(id),
      amount            DECIMAL(10, 2) NOT NULL,
      goods_description TEXT,
      balance_before    DECIMAL(10, 2) NOT NULL,
      balance_after     DECIMAL(10, 2) NOT NULL,
      status            VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('completed', 'failed')),
      transaction_at    TIMESTAMP DEFAULT NOW()
    );

    -- NGO_ACCOUNTS (virtual wallet, one per admin)
    CREATE TABLE ngo_accounts (
      id         SERIAL PRIMARY KEY,
      user_id    INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      balance    DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- NGO_ACCOUNT_TRANSACTIONS (ledger)
    CREATE TABLE ngo_account_transactions (
      id             SERIAL PRIMARY KEY,
      ngo_account_id INT REFERENCES ngo_accounts(id),
      type           VARCHAR(50) NOT NULL CHECK (type IN ('deposit', 'campaign_fund', 'campaign_refund')),
      amount         DECIMAL(14, 2) NOT NULL,
      reference_id   INT,
      note           TEXT,
      created_at     TIMESTAMP DEFAULT NOW()
    );

    -- RECEIPTS (one per transaction)
    CREATE TABLE receipts (
      id             SERIAL PRIMARY KEY,
      transaction_id INT UNIQUE REFERENCES transactions(id) ON DELETE CASCADE,
      receipt_code   VARCHAR(100) UNIQUE NOT NULL,
      issued_at      TIMESTAMP DEFAULT NOW()
    );

    -- AUDIT_LOGS
    CREATE TABLE audit_logs (
      id          SERIAL PRIMARY KEY,
      user_id     INT REFERENCES users(id),
      action      VARCHAR(255) NOT NULL,
      entity_type VARCHAR(100),
      entity_id   INT,
      logged_at   TIMESTAMP DEFAULT NOW()
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS audit_logs;
    DROP TABLE IF EXISTS receipts;
    DROP TABLE IF EXISTS ngo_account_transactions;
    DROP TABLE IF EXISTS ngo_accounts;
    DROP TABLE IF EXISTS transactions;
    DROP TABLE IF EXISTS campaign_beneficiaries;
    DROP TABLE IF EXISTS campaigns;
    DROP TABLE IF EXISTS beneficiaries;
    DROP TABLE IF EXISTS shop_managers;
    DROP TABLE IF EXISTS shops;
    DROP TABLE IF EXISTS users;
  `);
};

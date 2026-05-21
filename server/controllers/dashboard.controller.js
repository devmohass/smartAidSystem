import pool from "../db.js";

export async function getDashboard(_req, res) {
  const {rows} = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM users)                                                AS user_count,
      (SELECT COUNT(*)::int FROM shops)                                                AS shop_count,
      (SELECT COUNT(*)::int FROM beneficiaries)                                        AS beneficiary_count,
      (SELECT COUNT(*)::int FROM campaigns)                                            AS campaign_total,
      (SELECT COUNT(*)::int FROM campaigns WHERE status = 'draft')                     AS campaign_draft,
      (SELECT COUNT(*)::int FROM campaigns WHERE status = 'active')                    AS campaign_active,
      (SELECT COUNT(*)::int FROM campaigns WHERE status = 'closed')                    AS campaign_closed,
      (SELECT COUNT(*)::int FROM transactions)                                         AS transaction_count,
      (SELECT COALESCE(SUM(amount), 0)::float FROM transactions)                       AS transaction_volume,
      (SELECT COALESCE(SUM(balance), 0)::float FROM ngo_accounts)                      AS ngo_total_balance,
      (SELECT COALESCE(SUM(amount), 0)::float FROM ngo_account_transactions
         WHERE type = 'deposit')                                                       AS ngo_total_deposits,
      (SELECT COALESCE(SUM(amount), 0)::float FROM ngo_account_transactions
         WHERE type = 'campaign_fund')                                                 AS ngo_total_funded,
      (SELECT COALESCE(SUM(amount), 0)::float FROM ngo_account_transactions
         WHERE type = 'campaign_refund')                                               AS ngo_total_refunded
  `);

  const r = rows[0];
  return res.status(200).json({
    dashboard: {
      totals: {
        users: r.user_count,
        shops: r.shop_count,
        beneficiaries: r.beneficiary_count,
        transactions: r.transaction_count,
        transaction_volume: r.transaction_volume,
      },
      campaigns: {
        total: r.campaign_total,
        draft: r.campaign_draft,
        active: r.campaign_active,
        closed: r.campaign_closed,
      },
      ngo_accounts: {
        total_balance: r.ngo_total_balance,
        total_deposits: r.ngo_total_deposits,
        total_funded: r.ngo_total_funded,
        total_refunded: r.ngo_total_refunded,
      },
    },
  });
}

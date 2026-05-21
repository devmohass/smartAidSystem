import "dotenv/config";
import pkg from "pg";
import bcrypt from "bcrypt";

const {Pool} = pkg;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

async function getOrInsertUser(client, {name, email, password, role}) {
  const existing = await client.query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rows.length) return existing.rows[0].id;
  const password_hash = await bcrypt.hash(password, 10);
  const {rows} = await client.query(
    "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id",
    [name, email, password_hash, role]
  );
  return rows[0].id;
}

async function getOrInsertShop(client, {name, location, owner_name, created_by}) {
  const existing = await client.query("SELECT id FROM shops WHERE name = $1", [name]);
  if (existing.rows.length) return existing.rows[0].id;
  const {rows} = await client.query(
    "INSERT INTO shops (name, location, owner_name, created_by) VALUES ($1, $2, $3, $4) RETURNING id",
    [name, location, owner_name, created_by]
  );
  return rows[0].id;
}

async function ensureShopManager(client, {user_id, shop_id}) {
  await client.query(
    "INSERT INTO shop_managers (user_id, shop_id) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET shop_id = EXCLUDED.shop_id",
    [user_id, shop_id]
  );
}

async function ensureNgoAccount(client, {user_id, balance}) {
  await client.query(
    "INSERT INTO ngo_accounts (user_id, balance) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING",
    [user_id, balance]
  );
}

async function getOrInsertBeneficiary(client, {name, phone_number, qr_code, family_size, location, created_by}) {
  const existing = await client.query("SELECT id FROM beneficiaries WHERE phone_number = $1", [phone_number]);
  if (existing.rows.length) return existing.rows[0].id;
  const {rows} = await client.query(
    `INSERT INTO beneficiaries (name, phone_number, qr_code, family_size, location, created_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [name, phone_number, qr_code, family_size, location, created_by]
  );
  return rows[0].id;
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    console.log("Seeding users...");
    const adminId = await getOrInsertUser(client, {
      name: "Test Admin",
      email: "admin@smartaid.com",
      password: "admin123",
      role: "admin",
    });
    const managerId = await getOrInsertUser(client, {
      name: "Test Shop Manager",
      email: "manager@smartaid.com",
      password: "manager123",
      role: "shop_manager",
    });

    console.log("Seeding NGO virtual account...");
    await ensureNgoAccount(client, {user_id: adminId, balance: 10000.0});

    console.log("Seeding shop...");
    const shopId = await getOrInsertShop(client, {
      name: "SmartAid Test Shop",
      location: "Mogadishu",
      owner_name: "Aweys Ali",
      created_by: adminId,
    });

    console.log("Linking shop manager to shop...");
    await ensureShopManager(client, {user_id: managerId, shop_id: shopId});

    console.log("Seeding beneficiaries...");
    await getOrInsertBeneficiary(client, {
      name: "Fadumo Hassan",
      phone_number: "+252611111111",
      qr_code: "QR-BEN-001",
      family_size: 5,
      location: "Mogadishu - Wadajir",
      created_by: adminId,
    });
    await getOrInsertBeneficiary(client, {
      name: "Mohamed Ahmed",
      phone_number: "+252622222222",
      qr_code: "QR-BEN-002",
      family_size: 4,
      location: "Mogadishu - Hodan",
      created_by: adminId,
    });

    await client.query("COMMIT");

    console.log("\nSeed complete.");
    console.log("  admin login:        admin@smartaid.com / admin123");
    console.log("  shop manager login: manager@smartaid.com / manager123");
    console.log("  NGO account balance: 10000.00");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seed failed:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();

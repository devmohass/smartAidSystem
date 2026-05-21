import pkg from "pg";
const {Pool} = pkg;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

const connectWithRetry = async () => {
  for (let i = 0; i < 10; i++) {
    let client;
    try {
      client = await pool.connect();
      await client.query("SELECT 1");
      console.log("PostgreSQL connected");
      return;
    } catch (err) {
      console.log(`DB not ready, retrying... ${i + 1} (${err.message})`);
      await new Promise((res) => setTimeout(res, 3000));
    } finally {
      client?.release();
    }
  }

  console.error("Failed to connect to PostgreSQL after retries");
};

connectWithRetry();

export default pool;

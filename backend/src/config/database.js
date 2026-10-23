
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");
const path = require("node:path");

// Load environment variables from project root
dotenv.config({
  path: path.resolve(__dirname, "../../../.env"),
});

// Create MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "ecommerce",

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  enableKeepAlive: true,
  keepAliveInitialDelay: 0,

  decimalNumbers: true,
});

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();

    await connection.ping();

    connection.release();

    console.log("[DATABASE] MySQL connected successfully");

    return true;
  } catch (error) {
    console.error(
      "[DATABASE] Connection failed:",
      error.code || error.message
    );

    return false;
  }
}

// Export for controllers and services
module.exports = {
  pool,
  testConnection,
};

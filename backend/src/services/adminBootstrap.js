
const bcrypt = require("bcryptjs");

const { pool } = require("../config/database");

// ==========================================
// INITIAL ADMIN ACCOUNT
// ==========================================

async function createInitialAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !password ||
    password.length < 12 ||
    password.length > 72
  ) {
    throw new Error(
      "ADMIN_EMAIL or ADMIN_PASSWORD is invalid"
    );
  }

  // Check whether the account already exists
  const [users] = await pool.execute(
    "SELECT id, role FROM users WHERE email = ?",
    [email]
  );

  if (users.length > 0) {
    if (users[0].role !== "admin") {
      throw new Error(
        "Email already belongs to a non-admin account"
      );
    }

    console.log("[ADMIN] Admin account already exists");
    return;
  }

  // Hash password before inserting into MySQL
  const passwordHash = await bcrypt.hash(password, 12);

  await pool.execute(
    `INSERT INTO users
     (name, email, password_hash, role)
     VALUES (?, ?, ?, 'admin')`,
    ["Administrator", email, passwordHash]
  );

  console.log("[ADMIN] Initial admin created successfully");
}

// ==========================================
// RUN BOOTSTRAP
// ==========================================

async function main() {
  try {
    await createInitialAdmin();
  } catch (error) {
    console.error("[ADMIN] Setup failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();

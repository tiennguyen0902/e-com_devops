
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/database");

// ==========================================
// Utility functions
// ==========================================

function isValidEmail(email) {
  return (
    typeof email === "string" &&
    email.length <= 191 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

function createToken(user) {
  if (!process.env.JWT_SECRET ||
      process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET is not configured securely");
  }

  return jwt.sign(
    {
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      subject: String(user.id),
      algorithm: "HS256",
      expiresIn: process.env.JWT_EXPIRES_IN || "2h",
    }
  );
}

function safeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

// ==========================================
// POST /api/auth/register
// ==========================================

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (
      typeof name !== "string" ||
      name.trim().length < 2 ||
      name.length > 100 ||
      !isValidEmail(email) ||
      typeof password !== "string" ||
      password.length < 10 ||
      password.length > 72
    ) {
      return res.status(400).json({
        success: false,
        message: "Thông tin đăng ký không hợp lệ",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [existingUsers] = await pool.execute(
      "SELECT id FROM users WHERE email = ?",
      [normalizedEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email đã được sử dụng",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Role is fixed to user.
    // Never accept role from the request body.
    const [result] = await pool.execute(
      `INSERT INTO users
       (name, email, password_hash, role)
       VALUES (?, ?, ?, 'user')`,
      [name.trim(), normalizedEmail, passwordHash]
    );

    return res.status(201).json({
      success: true,
      message: "Đăng ký thành công",
      data: {
        id: result.insertId,
        name: name.trim(),
        email: normalizedEmail,
        role: "user",
      },
    });

  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "Email đã được sử dụng",
      });
    }

    next(error);
  }
}

// ==========================================
// POST /api/auth/login
// ==========================================

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập email và mật khẩu",
      });
    }

    const [users] = await pool.execute(
      `SELECT id, name, email, password_hash, role
       FROM users
       WHERE email = ?`,
      [email.trim().toLowerCase()]
    );

    const user = users[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không chính xác",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không chính xác",
      });
    }

    const token = createToken(user);

    return res.status(200).json({
      success: true,
      message: "Đăng nhập thành công",
      data: {
        token,
        user: safeUser(user),
      },
    });

  } catch (error) {
    next(error);
  }
}

// ==========================================
// GET /api/auth/me
// Requires authentication middleware
// ==========================================

async function getProfile(req, res, next) {
  try {
    const userId = req.user.id;

    const [users] = await pool.execute(
      `SELECT id, name, email, role
       FROM users
       WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tài khoản",
      });
    }

    return res.status(200).json({
      success: true,
      data: safeUser(users[0]),
    });

  } catch (error) {
    next(error);
  }
}

// ==========================================
// POST /api/auth/logout
// ==========================================

function logout(req, res) {
  // JWT is stateless.
  // The client must discard its token.
  return res.status(200).json({
    success: true,
    message: "Đăng xuất thành công. Hãy xóa token phía client.",
  });
}

// ==========================================
// Exports
// ==========================================

module.exports = {
  register,
  login,
  getProfile,
  logout,
};

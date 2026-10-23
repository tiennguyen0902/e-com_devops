
const jwt = require("jsonwebtoken");
const { pool } = require("../config/database");

// ==========================================
// AUTHENTICATION MIDDLEWARE
// ==========================================

async function authenticate(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message: "Vui lòng đăng nhập để tiếp tục",
      });
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token không hợp lệ",
      });
    }

    if (
      !process.env.JWT_SECRET ||
      process.env.JWT_SECRET.length < 32
    ) {
      return next(
        new Error("JWT_SECRET is not configured securely")
      );
    }

    let decoded;

    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET,
        {
          algorithms: ["HS256"],
        }
      );
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Token không hợp lệ hoặc đã hết hạn",
      });
    }

    // Verify user against the database.
    // Use the current role from MySQL.
    const [users] = await pool.execute(
      `SELECT id, name, email, role
       FROM users
       WHERE id = ?`,
      [decoded.sub]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Tài khoản không còn tồn tại",
      });
    }

    req.user = {
      id: users[0].id,
      name: users[0].name,
      email: users[0].email,
      role: users[0].role,
    };

    next();

  } catch (error) {
    next(error);
  }
}

// ==========================================
// AUTHORIZATION MIDDLEWARE
// ==========================================

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Chưa xác thực người dùng",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền truy cập chức năng này",
      });
    }

    next();
  };
}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  authenticate,
  authorize,
};

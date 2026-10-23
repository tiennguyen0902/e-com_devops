
const express = require("express");
const { rateLimit } = require("express-rate-limit");

const {
  register,
  login,
  getProfile,
  logout,
} = require("../controllers/authController");

const {
  authenticate,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Rate limit for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút.",
  },
});

// ==========================================
// PUBLIC ROUTES
// ==========================================

// POST /api/auth/register
router.post("/register", authLimiter, register);

// POST /api/auth/login
router.post("/login", authLimiter, login);

// ==========================================
// PROTECTED ROUTES
// ==========================================

// GET /api/auth/me
router.get("/me", authenticate, getProfile);

// POST /api/auth/logout
router.post("/logout", authenticate, logout);

module.exports = router;

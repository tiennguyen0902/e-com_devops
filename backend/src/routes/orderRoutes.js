
const express = require("express");

const {
  placeOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
} = require("../controllers/orderController");

const {
  authenticate,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

// ==========================================
// AUTHENTICATION
// ==========================================

// All order APIs require a valid JWT
router.use(authenticate);

// ==========================================
// USER AND ADMIN ROUTES
// ==========================================

// POST /api/orders
// Create order from current user's cart
router.post(
  "/",
  authorize("user", "admin"),
  placeOrder
);

// GET /api/orders
// User sees own orders; Admin sees all
router.get(
  "/",
  authorize("user", "admin"),
  getOrders
);

// GET /api/orders/:id
// Controller checks order ownership
router.get(
  "/:id",
  authorize("user", "admin"),
  getOrderById
);

// ==========================================
// ADMIN ONLY ROUTES
// ==========================================

// PATCH /api/orders/:id/status
// Only Admin can update order status
router.patch(
  "/:id/status",
  authorize("admin"),
  updateOrderStatus
);

// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;

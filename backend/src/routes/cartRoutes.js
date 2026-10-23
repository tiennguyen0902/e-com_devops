
const express = require("express");

const {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
} = require("../controllers/cartController");

const {
  authenticate,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

// ==========================================
// AUTHENTICATION & AUTHORIZATION
// ==========================================

// All cart APIs require login
router.use(authenticate);

// Both user and admin can use their own cart
router.use(authorize("user", "admin"));

// ==========================================
// CART ROUTES
// ==========================================

// GET /api/cart
// View current user's cart
router.get("/", getCart);

// POST /api/cart
// Add product to cart
router.post("/", addToCart);

// PUT /api/cart/:productId
// Update product quantity
router.put("/:productId", updateCartItem);

// DELETE /api/cart/:productId
// Remove product from cart
router.delete("/:productId", removeCartItem);

// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;

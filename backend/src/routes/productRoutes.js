
const express = require("express");

const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const {
  authenticate,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

// ==========================================
// PUBLIC ROUTES
// ==========================================

// GET /api/products
// Everyone can view products
router.get("/", getProducts);

// GET /api/products/:id
// Everyone can view product details
router.get("/:id", getProductById);

// ==========================================
// ADMIN ONLY ROUTES
// ==========================================

// POST /api/products
// Create a new product
router.post(
  "/",
  authenticate,
  authorize("admin"),
  createProduct
);

// PUT /api/products/:id
// Update an existing product
router.put(
  "/:id",
  authenticate,
  authorize("admin"),
  updateProduct
);

// DELETE /api/products/:id
// Delete a product
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  deleteProduct
);

// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;

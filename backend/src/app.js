
const express = require("express");
const helmet = require("helmet");

// ==========================================
// IMPORT ROUTES
// ==========================================

const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");

// ==========================================
// IMPORT MIDDLEWARE
// ==========================================

const {
  notFoundHandler,
  errorHandler,
} = require("./middleware/errorMiddleware");

// ==========================================
// DATABASE
// ==========================================

const { pool } = require("./config/database");

// ==========================================
// INITIALIZE EXPRESS
// ==========================================

const app = express();
app.set("trust proxy", 1);

// Disable Express identification header
app.disable("x-powered-by");

// ==========================================
// SECURITY MIDDLEWARE
// ==========================================

app.use(helmet());

// ==========================================
// REQUEST BODY PARSING
// ==========================================

app.use(express.json({ limit: "32kb" }));

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/health", async (req, res, next) => {
  try {
    await pool.query("SELECT 1");

    return res.status(200).json({
      success: true,
      status: "healthy",
      service: "ecommerce-backend",
      database: "connected",
    });

  } catch (error) {
    next(error);
  }
});

// ==========================================
// API ROUTES
// ==========================================

// Authentication
// POST /api/auth/register
// POST /api/auth/login
// GET  /api/auth/me
// POST /api/auth/logout

app.use("/api/auth", authRoutes);

// Products
// GET    /api/products
// GET    /api/products/:id
// POST   /api/products
// PUT    /api/products/:id
// DELETE /api/products/:id

app.use("/api/products", productRoutes);

// Shopping Cart
// GET    /api/cart
// POST   /api/cart
// PUT    /api/cart/:productId
// DELETE /api/cart/:productId

app.use("/api/cart", cartRoutes);

// Orders
// POST  /api/orders
// GET   /api/orders
// GET   /api/orders/:id
// PATCH /api/orders/:id/status

app.use("/api/orders", orderRoutes);

// ==========================================
// ERROR HANDLING
// ==========================================

// Handle unknown endpoints
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

// ==========================================
// EXPORT EXPRESS APP
// ==========================================

module.exports = app;

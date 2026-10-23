
const app = require("./app");
const { pool, testConnection } = require("./config/database");

// ==========================================
// SERVER CONFIGURATION
// ==========================================

const PORT = Number(process.env.PORT || 3000);
const HOST = "0.0.0.0";

let server;

// ==========================================
// START SERVER
// ==========================================

async function startServer() {
  try {
    console.log("[SERVER] Starting E-commerce Backend...");

    // Validate critical environment variables
    if (
      !process.env.JWT_SECRET ||
      process.env.JWT_SECRET.length < 32
    ) {
      throw new Error(
        "JWT_SECRET must contain at least 32 characters"
      );
    }

    // Verify database connection
    const isConnected = await testConnection();

    if (!isConnected) {
      throw new Error("Cannot connect to MySQL database");
    }

    // Start HTTP server
    server = app.listen(PORT, HOST, () => {
      console.log("[SERVER] Backend started successfully");
      console.log(`[SERVER] Port: ${PORT}`);
      console.log(`[SERVER] Health: http://localhost:${PORT}/health`);
    });

  } catch (error) {
    console.error("[SERVER] Startup failed:", error.message);
    await pool.end();
    process.exitCode = 1;
  }
}

// ==========================================
// GRACEFUL SHUTDOWN
// ==========================================

async function shutdown(signal) {
  console.log(`[SERVER] Received ${signal}`);

  if (server) {
    await new Promise((resolve) => {
      server.close(resolve);
    });
  }

  await pool.end();

  console.log("[SERVER] Shutdown completed");
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// ==========================================
// RUN APPLICATION
// ==========================================

startServer();

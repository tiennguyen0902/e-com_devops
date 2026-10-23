
// ==========================================
// E-COMMERCE - ERROR HANDLING MIDDLEWARE
// ==========================================

// Handle unknown API endpoints
function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
}

// Centralized error handler
function errorHandler(err, req, res, next) {
  // Prevent sending another response
  if (res.headersSent) {
    return next(err);
  }

  // Determine HTTP status
  const statusCode =
    Number.isInteger(err.status) &&
    err.status >= 400 &&
    err.status <= 599
      ? err.status
      : Number.isInteger(err.statusCode) &&
          err.statusCode >= 400 &&
          err.statusCode <= 599
        ? err.statusCode
        : 500;

  // Structured log for future Loki integration
  console.error(
    JSON.stringify({
      level: "error",
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl,
      statusCode,
      error: err.message,
    })
  );

  // Do not expose internal server errors
  const message =
    statusCode >= 500
      ? "Internal Server Error"
      : err.message || "Request failed";

  return res.status(statusCode).json({
    success: false,
    message,
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};

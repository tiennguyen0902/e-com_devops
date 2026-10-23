
const { pool } = require("../config/database");
const { createOrder } = require("../services/orderService");

// ==========================================
// HELPERS
// ==========================================

function isValidId(id) {
  return (
    /^\d+$/.test(String(id)) &&
    Number.isSafeInteger(Number(id)) &&
    Number(id) > 0
  );
}

function businessError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

// Allowed order status transitions
const allowedTransitions = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipping", "cancelled"],
  shipping: ["completed"],
  completed: [],
  cancelled: [],
};

// ==========================================
// POST /api/orders
// CREATE ORDER
// ==========================================

async function placeOrder(req, res, next) {
  try {
    const userId = req.user.id;

    const order = await createOrder(userId);

    return res.status(201).json({
      success: true,
      message: "Đặt hàng thành công",
      data: order,
    });

  } catch (error) {
    next(error);
  }
}

// ==========================================
// GET /api/orders
// LIST ORDERS
// ==========================================

async function getOrders(req, res, next) {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let orders;

    if (role === "admin") {
      // Admin can view all orders
      const [rows] = await pool.query(
        `SELECT
            o.id,
            o.user_id,
            u.name AS customer_name,
            u.email AS customer_email,
            o.total_amount,
            o.status,
            o.created_at
         FROM orders o
         INNER JOIN users u ON o.user_id = u.id
         ORDER BY o.id DESC`
      );

      orders = rows;

    } else {
      // User can only view their own orders
      const [rows] = await pool.execute(
        `SELECT
            id,
            total_amount,
            status,
            created_at
         FROM orders
         WHERE user_id = ?
         ORDER BY id DESC`,
        [userId]
      );

      orders = rows;
    }

    return res.status(200).json({
      success: true,
      data: orders,
    });

  } catch (error) {
    next(error);
  }
}

// ==========================================
// GET /api/orders/:id
// VIEW ORDER DETAILS
// ==========================================

async function getOrderById(req, res, next) {
  try {
    const orderId = req.params.id;

    if (!isValidId(orderId)) {
      return res.status(400).json({
        success: false,
        message: "ID đơn hàng không hợp lệ",
      });
    }

    const [orders] = await pool.execute(
      `SELECT
          id,
          user_id,
          total_amount,
          status,
          created_at
       FROM orders
       WHERE id = ?`,
      [orderId]
    );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng",
      });
    }

    const order = orders[0];

    // Ownership check
    if (
      req.user.role !== "admin" &&
      String(order.user_id) !== String(req.user.id)
    ) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền xem đơn hàng này",
      });
    }

    const [items] = await pool.execute(
      `SELECT
          product_id,
          product_name,
          quantity,
          unit_price,
          (quantity * unit_price) AS subtotal
       FROM order_items
       WHERE order_id = ?
       ORDER BY id`,
      [orderId]
    );

    return res.status(200).json({
      success: true,
      data: {
        ...order,
        items,
      },
    });

  } catch (error) {
    next(error);
  }
}

// ==========================================
// PATCH /api/orders/:id/status
// ADMIN ONLY
// ==========================================

async function updateOrderStatus(req, res, next) {
  const orderId = req.params.id;
  const newStatus = req.body.status;

  if (!isValidId(orderId)) {
    return res.status(400).json({
      success: false,
      message: "ID đơn hàng không hợp lệ",
    });
  }

  if (
    typeof newStatus !== "string" ||
    !Object.prototype.hasOwnProperty.call(
      allowedTransitions,
      newStatus
    )
  ) {
    return res.status(400).json({
      success: false,
      message: "Trạng thái đơn hàng không hợp lệ",
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Lock order to prevent concurrent status changes
    const [orders] = await connection.execute(
      "SELECT id, status FROM orders WHERE id = ? FOR UPDATE",
      [orderId]
    );

    if (orders.length === 0) {
      throw businessError(404, "Không tìm thấy đơn hàng");
    }

    const currentStatus = orders[0].status;

    if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
      throw businessError(
        409,
        "Không thể chuyển sang trạng thái đơn hàng này"
      );
    }

    // Restore stock when cancelling an eligible order
    if (newStatus === "cancelled") {
      const [items] = await connection.execute(
        `SELECT product_id, quantity
         FROM order_items
         WHERE order_id = ?
         ORDER BY product_id`,
        [orderId]
      );

      for (const item of items) {
        await connection.execute(
          `UPDATE products
           SET stock = stock + ?
           WHERE id = ?`,
          [item.quantity, item.product_id]
        );
      }
    }

    // Update status
    await connection.execute(
      "UPDATE orders SET status = ? WHERE id = ?",
      [newStatus, orderId]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái đơn hàng thành công",
      data: {
        id: Number(orderId),
        status: newStatus,
      },
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    next(error);

  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  placeOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
};

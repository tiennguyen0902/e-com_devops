
const { pool } = require("../config/database");

// ==========================================
// BUSINESS ERROR
// ==========================================

function businessError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

// ==========================================
// CREATE ORDER FROM CART
// ==========================================

async function createOrder(userId) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Get and lock current user's cart
    const [cartItems] = await connection.execute(
      `SELECT product_id, quantity
       FROM cart_items
       WHERE user_id = ?
       ORDER BY product_id
       FOR UPDATE`,
      [userId]
    );

    if (cartItems.length === 0) {
      throw businessError(400, "Giỏ hàng đang trống");
    }

    const orderItems = [];
    let totalCents = 0;

    // 2. Check each product and lock stock
    for (const cartItem of cartItems) {
      const [products] = await connection.execute(
        `SELECT id, name, price, stock
         FROM products
         WHERE id = ?
         FOR UPDATE`,
        [cartItem.product_id]
      );

      const product = products[0];

      if (!product) {
        throw businessError(
          404,
          "Sản phẩm trong giỏ hàng không tồn tại"
        );
      }

      if (cartItem.quantity > product.stock) {
        throw businessError(
          409,
          `Sản phẩm ${product.name} không đủ tồn kho`
        );
      }

      // Calculate money in integer cents
      const unitPriceCents = Math.round(
        Number(product.price) * 100
      );

      totalCents += unitPriceCents * cartItem.quantity;

      orderItems.push({
        productId: product.id,
        name: product.name,
        quantity: cartItem.quantity,
        unitPrice: Number(product.price),
      });
    }

    const totalAmount = totalCents / 100;

    // 3. Create order
    const [orderResult] = await connection.execute(
      `INSERT INTO orders
       (user_id, total_amount, status)
       VALUES (?, ?, 'pending')`,
      [userId, totalAmount]
    );

    const orderId = orderResult.insertId;

    // 4. Insert order details and update stock
    for (const item of orderItems) {
      await connection.execute(
        `INSERT INTO order_items
         (
           order_id,
           product_id,
           product_name,
           quantity,
           unit_price
         )
         VALUES (?, ?, ?, ?, ?)`,
        [
          orderId,
          item.productId,
          item.name,
          item.quantity,
          item.unitPrice,
        ]
      );

      await connection.execute(
        `UPDATE products
         SET stock = stock - ?
         WHERE id = ?`,
        [item.quantity, item.productId]
      );
    }

    // 5. Clear purchased items from cart
    await connection.execute(
      "DELETE FROM cart_items WHERE user_id = ?",
      [userId]
    );

    // 6. Commit transaction
    await connection.commit();

    return {
      id: orderId,
      total_amount: totalAmount,
      status: "pending",
      items: orderItems,
    };

  } catch (error) {
    // Rollback all changes if anything fails
    await connection.rollback();
    throw error;

  } finally {
    connection.release();
  }
}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  createOrder,
};

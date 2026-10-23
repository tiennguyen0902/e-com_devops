
const { pool } = require("../config/database");

// ==========================================
// VALIDATION HELPERS
// ==========================================

function isValidId(id) {
  return (
    /^\d+$/.test(String(id)) &&
    Number.isSafeInteger(Number(id)) &&
    Number(id) > 0
  );
}

function isValidQuantity(quantity) {
  return (
    Number.isInteger(quantity) &&
    quantity > 0 &&
    quantity <= 10000
  );
}

// ==========================================
// GET /api/cart
// VIEW CURRENT USER CART
// ==========================================

async function getCart(req, res, next) {
  try {
    const userId = req.user.id;

    const [items] = await pool.execute(
      `SELECT
          c.product_id,
          p.name,
          p.price,
          p.stock,
          p.image_url,
          c.quantity,
          (p.price * c.quantity) AS subtotal
       FROM cart_items c
       INNER JOIN products p
           ON c.product_id = p.id
       WHERE c.user_id = ?
       ORDER BY c.id DESC`,
      [userId]
    );

    const totalAmount = items.reduce(
      (total, item) => total + Number(item.subtotal),
      0
    );

    return res.status(200).json({
      success: true,
      data: {
        items,
        total_amount: totalAmount,
      },
    });

  } catch (error) {
    next(error);
  }
}

// ==========================================
// POST /api/cart
// ADD PRODUCT TO CART
// ==========================================

async function addToCart(req, res, next) {
  const userId = req.user.id;
  const { product_id, quantity } = req.body;

  if (!isValidId(product_id) || !isValidQuantity(quantity)) {
    return res.status(400).json({
      success: false,
      message: "Sản phẩm hoặc số lượng không hợp lệ",
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Lock product while checking stock
    const [products] = await connection.execute(
      "SELECT id, stock FROM products WHERE id = ? FOR UPDATE",
      [product_id]
    );

    if (products.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    const [existingItems] = await connection.execute(
      `SELECT quantity
       FROM cart_items
       WHERE user_id = ? AND product_id = ?
       FOR UPDATE`,
      [userId, product_id]
    );

    const currentQuantity =
      existingItems.length > 0
        ? existingItems[0].quantity
        : 0;

    const newQuantity = currentQuantity + quantity;

    if (
      !isValidQuantity(newQuantity) ||
      newQuantity > products[0].stock
    ) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message: "Số lượng vượt quá tồn kho",
      });
    }

    if (existingItems.length > 0) {
      await connection.execute(
        `UPDATE cart_items
         SET quantity = ?
         WHERE user_id = ? AND product_id = ?`,
        [newQuantity, userId, product_id]
      );
    } else {
      await connection.execute(
        `INSERT INTO cart_items
         (user_id, product_id, quantity)
         VALUES (?, ?, ?)`,
        [userId, product_id, quantity]
      );
    }

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Đã thêm sản phẩm vào giỏ hàng",
      data: {
        product_id,
        quantity: newQuantity,
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
// PUT /api/cart/:productId
// UPDATE CART QUANTITY
// ==========================================

async function updateCartItem(req, res, next) {
  const userId = req.user.id;
  const productId = req.params.productId;
  const { quantity } = req.body;

  if (!isValidId(productId) || !isValidQuantity(quantity)) {
    return res.status(400).json({
      success: false,
      message: "Sản phẩm hoặc số lượng không hợp lệ",
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [products] = await connection.execute(
      "SELECT stock FROM products WHERE id = ? FOR UPDATE",
      [productId]
    );

    if (products.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    if (quantity > products[0].stock) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message: "Số lượng vượt quá tồn kho",
      });
    }

    const [result] = await connection.execute(
      `UPDATE cart_items
       SET quantity = ?
       WHERE user_id = ? AND product_id = ?`,
      [quantity, userId, productId]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Sản phẩm không có trong giỏ hàng",
      });
    }

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Cập nhật giỏ hàng thành công",
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
// DELETE /api/cart/:productId
// REMOVE PRODUCT FROM CART
// ==========================================

async function removeCartItem(req, res, next) {
  try {
    const userId = req.user.id;
    const productId = req.params.productId;

    if (!isValidId(productId)) {
      return res.status(400).json({
        success: false,
        message: "ID sản phẩm không hợp lệ",
      });
    }

    const [result] = await pool.execute(
      `DELETE FROM cart_items
       WHERE user_id = ? AND product_id = ?`,
      [userId, productId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Sản phẩm không có trong giỏ hàng",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Đã xóa sản phẩm khỏi giỏ hàng",
    });

  } catch (error) {
    next(error);
  }
}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
};

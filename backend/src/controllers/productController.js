
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

function validateProduct(data) {
  const {
    name,
    description = "",
    price,
    stock,
    image_url = null,
  } = data;

  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.length > 200
  ) {
    return "Tên sản phẩm không hợp lệ";
  }

  if (typeof description !== "string") {
    return "Mô tả sản phẩm không hợp lệ";
  }

  if (
    typeof price !== "number" ||
    !Number.isFinite(price) ||
    price < 0 ||
    price > 9999999999.99
  ) {
    return "Giá sản phẩm không hợp lệ";
  }

  if (
    !Number.isInteger(stock) ||
    stock < 0 ||
    stock > 1000000
  ) {
    return "Số lượng tồn kho không hợp lệ";
  }

  if (
    image_url !== null &&
    (
      typeof image_url !== "string" ||
      image_url.length > 500 ||
      !/^https:\/\//.test(image_url)
    )
  ) {
    return "Đường dẫn ảnh không hợp lệ";
  }

  return null;
}

// ==========================================
// GET /api/products
// ==========================================

async function getProducts(req, res, next) {
  try {
    const [products] = await pool.query(
      `SELECT
          id,
          name,
          description,
          price,
          stock,
          image_url
       FROM products
       ORDER BY id DESC`
    );

    return res.status(200).json({
      success: true,
      data: products,
    });

  } catch (error) {
    next(error);
  }
}

// ==========================================
// GET /api/products/:id
// ==========================================

async function getProductById(req, res, next) {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "ID sản phẩm không hợp lệ",
      });
    }

    const [products] = await pool.execute(
      `SELECT
          id,
          name,
          description,
          price,
          stock,
          image_url
       FROM products
       WHERE id = ?`,
      [id]
    );

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    return res.status(200).json({
      success: true,
      data: products[0],
    });

  } catch (error) {
    next(error);
  }
}

// ==========================================
// POST /api/products
// ADMIN ONLY
// ==========================================

async function createProduct(req, res, next) {
  try {
    const validationError = validateProduct(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const {
      name,
      description = "",
      price,
      stock,
      image_url = null,
    } = req.body;

    const [result] = await pool.execute(
      `INSERT INTO products
       (name, description, price, stock, image_url)
       VALUES (?, ?, ?, ?, ?)`,
      [name.trim(), description, price, stock, image_url]
    );

    return res.status(201).json({
      success: true,
      message: "Thêm sản phẩm thành công",
      data: {
        id: result.insertId,
      },
    });

  } catch (error) {
    next(error);
  }
}

// ==========================================
// PUT /api/products/:id
// ADMIN ONLY
// ==========================================

async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "ID sản phẩm không hợp lệ",
      });
    }

    const validationError = validateProduct(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const {
      name,
      description = "",
      price,
      stock,
      image_url = null,
    } = req.body;

    const [result] = await pool.execute(
      `UPDATE products
       SET name = ?,
           description = ?,
           price = ?,
           stock = ?,
           image_url = ?
       WHERE id = ?`,
      [name.trim(), description, price, stock, image_url, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Cập nhật sản phẩm thành công",
    });

  } catch (error) {
    next(error);
  }
}

// ==========================================
// DELETE /api/products/:id
// ADMIN ONLY
// ==========================================

async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "ID sản phẩm không hợp lệ",
      });
    }

    const [result] = await pool.execute(
      "DELETE FROM products WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Xóa sản phẩm thành công",
    });

  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        success: false,
        message: "Không thể xóa sản phẩm đã có trong đơn hàng",
      });
    }

    next(error);
  }
}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};

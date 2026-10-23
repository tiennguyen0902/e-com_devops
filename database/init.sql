
-- ============================================================
-- E-COMMERCE DEVOPS - DATABASE INITIALIZATION
-- Database: MySQL 8.0
-- Project: E-commerce - De 9
-- ============================================================

CREATE DATABASE IF NOT EXISTS ecommerce
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE ecommerce;

-- ============================================================
-- 1. USERS
-- Quan ly tai khoan va phan quyen
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(191) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;


-- ============================================================
-- 2. PRODUCTS
-- Quan ly san pham va ton kho
-- ============================================================

CREATE TABLE IF NOT EXISTS products (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(12,2) NOT NULL,
    stock INT UNSIGNED NOT NULL DEFAULT 0,
    image_url VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT chk_product_price CHECK (price >= 0)
) ENGINE=InnoDB;


-- ============================================================
-- 3. CART_ITEMS
-- Luu gio hang rieng cua tung nguoi dung
-- ============================================================

CREATE TABLE IF NOT EXISTS cart_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    quantity INT UNSIGNED NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_cart_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_cart_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_cart_user_product
        UNIQUE (user_id, product_id),

    CONSTRAINT chk_cart_quantity
        CHECK (quantity > 0)
) ENGINE=InnoDB;


-- ============================================================
-- 4. ORDERS
-- Luu thong tin don hang
-- ============================================================

CREATE TABLE IF NOT EXISTS orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    status ENUM(
        'pending',
        'confirmed',
        'shipping',
        'completed',
        'cancelled'
    ) NOT NULL DEFAULT 'pending',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_order_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_order_total
        CHECK (total_amount >= 0)
) ENGINE=InnoDB;


-- ============================================================
-- 5. ORDER_ITEMS
-- Luu chi tiet san pham trong don hang
-- ============================================================

CREATE TABLE IF NOT EXISTS order_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    quantity INT UNSIGNED NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,

    CONSTRAINT fk_order_item_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_order_item_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE RESTRICT,

    CONSTRAINT uq_order_product
        UNIQUE (order_id, product_id),

    CONSTRAINT chk_order_item_quantity
        CHECK (quantity > 0),

    CONSTRAINT chk_order_item_price
        CHECK (unit_price >= 0)
) ENGINE=InnoDB;


-- ============================================================
-- 6. INDEXES
-- Toi uu truy van don hang va san pham
-- ============================================================

CREATE INDEX idx_products_name
    ON products(name);

CREATE INDEX idx_orders_user_created
    ON orders(user_id, created_at);

CREATE INDEX idx_orders_status
    ON orders(status);


-- ============================================================
-- 7. SAMPLE PRODUCTS
-- 5 san pham mau phuc vu kiem thu
-- Chi seed khi bang products dang rong
-- ============================================================

INSERT INTO products (
    name,
    description,
    price,
    stock,
    image_url
)
SELECT
    seed.name,
    seed.description,
    seed.price,
    seed.stock,
    seed.image_url
FROM (
    SELECT
        'Laptop Dell Inspiron 15' AS name,
        'Laptop Dell Inspiron 15, RAM 8GB, SSD 512GB' AS description,
        15990000.00 AS price,
        20 AS stock,
        NULL AS image_url

    UNION ALL

    SELECT
        'iPhone 15',
        'Apple iPhone 15, bo nho 128GB',
        17990000.00,
        15,
        NULL

    UNION ALL

    SELECT
        'Tai nghe Sony WH-CH520',
        'Tai nghe Bluetooth khong day Sony',
        990000.00,
        40,
        NULL

    UNION ALL

    SELECT
        'Chuot Logitech G102',
        'Chuot gaming Logitech G102',
        350000.00,
        50,
        NULL

    UNION ALL

    SELECT
        'Ban phim co Akko 3087',
        'Ban phim co Akko 3087, ket noi USB',
        1290000.00,
        25,
        NULL
) AS seed
WHERE NOT EXISTS (
    SELECT 1 FROM products
);


-- ============================================================
-- END OF DATABASE INITIALIZATION
-- ============================================================

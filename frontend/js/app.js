"use strict";

// ==========================================
// E-COMMERCE USER APPLICATION
// ==========================================

const API = window.ecommerceAPI;
const $ = (id) => document.getElementById(id);

const el = {
  authSection: $("auth-section"),
  loginPanel: $("login-panel"),
  registerPanel: $("register-panel"),
  loginForm: $("login-form"),
  registerForm: $("register-form"),
  showRegisterBtn: $("show-register-btn"),
  showLoginBtn: $("show-login-btn"),
  userInfo: $("user-info"),
  logoutBtn: $("logout-btn"),

  productsSection: $("products"),
  productsList: $("products-list"),
  refreshProducts: $("refresh-products"),

  cartSection: $("cart"),
  cartNav: document.querySelector('a[href="#cart"]'),
  cartItems: $("cart-items"),
  cartTotal: $("cart-total"),
  checkoutBtn: $("checkout-btn"),

  ordersSection: $("orders"),
  ordersNav: document.querySelector('a[href="#orders"]'),
  ordersList: $("orders-list"),
  refreshOrders: $("refresh-orders"),

  notification: $("notification"),
};

let currentPage = "products";

// ==========================================
// UTILITIES
// ==========================================

function money(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(Number(value) || 0);
}

function dateTime(value) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Không xác định"
    : date.toLocaleString("vi-VN");
}

function notify(message, type = "success") {
  el.notification.textContent = message;
  el.notification.className = `notification ${type}`;
  el.notification.hidden = false;

  clearTimeout(notify.timer);

  notify.timer = setTimeout(() => {
    el.notification.hidden = true;
  }, 5000);
}

function showError(error) {
  notify(error?.message || "Đã xảy ra lỗi", "error");
}

function create(tag, className = "", text) {
  const node = document.createElement(tag);
  node.className = className;

  if (text !== undefined) {
    node.textContent = String(text);
  }

  return node;
}

function isLoggedIn() {
  return (
    API.auth.isAuthenticated() &&
    Boolean(API.auth.getStoredUser())
  );
}

// ==========================================
// PAGE NAVIGATION
// ==========================================

function showPage(page) {
  const validPages = ["products", "cart", "orders"];

  if (!validPages.includes(page)) {
    page = "products";
  }

  if (!isLoggedIn() && page !== "products") {
    page = "products";
  }

  currentPage = page;

  // Only one page is visible at a time
  el.productsSection.hidden = page !== "products";
  el.cartSection.hidden = page !== "cart";
  el.ordersSection.hidden = page !== "orders";

  // Guest authentication area
  el.authSection.hidden =
    isLoggedIn() || page !== "products";

  // Highlight active navigation
  document.querySelectorAll(".main-nav a").forEach((link) => {
    const active =
      link.getAttribute("href") === `#${page}`;

    link.classList.toggle("active", active);

    if (active) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function navigateTo(page) {
  showPage(page);

  const target = `#${currentPage}`;

  if (window.location.hash !== target) {
    window.history.replaceState(null, "", target);
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

// ==========================================
// AUTHENTICATION
// ==========================================

function showLoginForm() {
  el.loginPanel.hidden = false;
  el.registerPanel.hidden = true;
}

function showRegisterForm() {
  el.loginPanel.hidden = true;
  el.registerPanel.hidden = false;
}

function updateAuthUI() {
  const user = API.auth.getStoredUser();
  const loggedIn = isLoggedIn();

  el.logoutBtn.hidden = !loggedIn;

  el.userInfo.textContent = loggedIn
    ? `${user.name} (${user.role})`
    : "";

  if (el.cartNav) {
    el.cartNav.hidden = !loggedIn;
  }

  if (el.ordersNav) {
    el.ordersNav.hidden = !loggedIn;
  }

  if (!loggedIn) {
    currentPage = "products";

    showLoginForm();

    el.checkoutBtn.disabled = true;
    el.cartTotal.textContent = money(0);
    el.cartItems.textContent = "";
    el.ordersList.textContent = "";
  }

  showPage(currentPage);
}

async function handleLogin(event) {
  event.preventDefault();

  const email = $("login-email").value.trim();
  const password = $("login-password").value;

  const button = el.loginForm.querySelector(
    'button[type="submit"]'
  );

  button.disabled = true;

  try {
    const response = await API.auth.login(email, password);

    if (!response.success || !response.data?.user) {
      throw new Error("Đăng nhập thất bại");
    }

    el.loginForm.reset();

    currentPage = "products";
    updateAuthUI();
    navigateTo("products");

    notify("Đăng nhập thành công");

    await Promise.all([
      loadCart(),
      loadOrders(),
    ]);

  } catch (error) {
    showError(error);

  } finally {
    button.disabled = false;
  }
}

async function handleRegister(event) {
  event.preventDefault();

  const name = $("register-name").value.trim();
  const email = $("register-email").value.trim();
  const password = $("register-password").value;

  const button = el.registerForm.querySelector(
    'button[type="submit"]'
  );

  button.disabled = true;

  try {
    await API.auth.register({
      name,
      email,
      password,
    });

    el.registerForm.reset();
    $("login-email").value = email;

    showLoginForm();

    notify("Đăng ký thành công. Vui lòng đăng nhập.");

  } catch (error) {
    showError(error);

  } finally {
    button.disabled = false;
  }
}

async function handleLogout() {
  try {
    await API.auth.logout();
  } catch {
    // Clear the local session even if the API request fails.
  } finally {
    API.auth.clearAuth();

    el.loginForm.reset();
    el.registerForm.reset();

    currentPage = "products";

    updateAuthUI();
    navigateTo("products");

    notify("Đã đăng xuất");
  }
}

// ==========================================
// PRODUCTS
// ==========================================

async function loadProducts() {
  try {
    const response = await API.products.getAll();
    renderProducts(response.data || []);

  } catch (error) {
    el.productsList.textContent =
      "Không thể tải danh sách sản phẩm.";

    showError(error);
  }
}

function renderProducts(products) {
  el.productsList.replaceChildren();

  if (!products.length) {
    el.productsList.textContent = "Chưa có sản phẩm.";
    return;
  }

  for (const product of products) {
    const card = create("article", "product-card");

    const image = create(
      "div",
      "product-placeholder",
      "🛍️"
    );

    const content = create("div", "product-content");

    const title = create(
      "h3",
      "product-title",
      product.name
    );

    const description = create(
      "p",
      "product-description",
      product.description || "Không có mô tả"
    );

    const price = create(
      "div",
      "product-price",
      money(product.price)
    );

    const stock = create(
      "div",
      "product-stock",
      `Tồn kho: ${product.stock}`
    );

    const button = create(
      "button",
      "btn btn-primary",
      product.stock > 0 ? "Thêm vào giỏ" : "Hết hàng"
    );

    button.type = "button";
    button.disabled = product.stock <= 0;

    button.addEventListener("click", () => {
      addProductToCart(product.id);
    });

    content.append(
      title,
      description,
      price,
      stock,
      button
    );

    card.append(image, content);
    el.productsList.appendChild(card);
  }
}

async function addProductToCart(productId) {
  if (!isLoggedIn()) {
    navigateTo("products");
    showLoginForm();

    notify("Vui lòng đăng nhập để mua hàng.", "error");
    return;
  }

  try {
    await API.cart.add(productId, 1);

    notify("Đã thêm sản phẩm vào giỏ hàng");

    await loadCart();

  } catch (error) {
    showError(error);
  }
}

// ==========================================
// SHOPPING CART
// ==========================================

async function loadCart() {
  if (!isLoggedIn()) {
    updateAuthUI();
    return;
  }

  try {
    const response = await API.cart.get();
    renderCart(response.data);

  } catch (error) {
    showError(error);
  }
}

function renderCart(cart) {
  el.cartItems.replaceChildren();

  const items = cart?.items || [];

  el.checkoutBtn.disabled = items.length === 0;

  if (!items.length) {
    el.cartItems.textContent = "Giỏ hàng đang trống.";
  }

  for (const item of items) {
    const row = create("div", "cart-item");
    const info = create("div");

    info.append(
      create("h3", "", item.name),
      create("p", "", money(item.price))
    );

    const quantity = create("input", "cart-quantity");

    quantity.type = "number";
    quantity.min = "1";
    quantity.max = String(item.stock);
    quantity.value = item.quantity;

    quantity.setAttribute(
      "aria-label",
      `Số lượng ${item.name}`
    );

    const actions = create("div", "cart-actions");

    // Update quantity
    const updateBtn = create(
      "button",
      "btn btn-outline btn-sm",
      "Cập nhật"
    );

    updateBtn.type = "button";

    updateBtn.addEventListener("click", async () => {
      const value = Number(quantity.value);

      if (
        !Number.isInteger(value) ||
        value < 1 ||
        value > item.stock
      ) {
        notify("Số lượng không hợp lệ", "error");
        return;
      }

      try {
        await API.cart.update(item.product_id, value);

        notify("Đã cập nhật giỏ hàng");
        await loadCart();

      } catch (error) {
        showError(error);
      }
    });

    // Remove product
    const removeBtn = create(
      "button",
      "btn btn-danger btn-sm",
      "Xóa"
    );

    removeBtn.type = "button";

    removeBtn.addEventListener("click", async () => {
      try {
        await API.cart.remove(item.product_id);

        notify("Đã xóa sản phẩm");
        await loadCart();

      } catch (error) {
        showError(error);
      }
    });

    actions.append(updateBtn, removeBtn);

    row.append(info, quantity, actions);

    el.cartItems.appendChild(row);
  }

  el.cartTotal.textContent = money(cart?.total_amount);
}

// ==========================================
// CHECKOUT
// ==========================================

async function handleCheckout() {
  if (!isLoggedIn()) {
    notify("Vui lòng đăng nhập", "error");
    return;
  }

  if (!window.confirm("Xác nhận đặt hàng?")) {
    return;
  }

  el.checkoutBtn.disabled = true;

  try {
    const response = await API.orders.create();

    notify(
      `Đặt hàng thành công! Mã đơn: ${response.data.id}`
    );

    await Promise.all([
      loadCart(),
      loadOrders(),
      loadProducts(),
    ]);

    navigateTo("orders");

  } catch (error) {
    showError(error);
    await loadCart();
  }
}

// ==========================================
// ORDERS
// ==========================================

async function loadOrders() {
  if (!isLoggedIn()) {
    updateAuthUI();
    return;
  }

  try {
    const response = await API.orders.getAll();
    renderOrders(response.data || []);

  } catch (error) {
    showError(error);
  }
}

function renderOrders(orders) {
  el.ordersList.replaceChildren();

  if (!orders.length) {
    el.ordersList.textContent = "Bạn chưa có đơn hàng.";
    return;
  }

  for (const order of orders) {
    const card = create("article", "order-card");
    const header = create("div", "order-header");

    const title = create(
      "h3",
      "",
      `Đơn hàng #${order.id}`
    );

    const badge = create(
      "span",
      `badge badge-${order.status}`,
      order.status
    );

    header.append(title, badge);

    card.append(
      header,
      create("p", "", dateTime(order.created_at)),
      create(
        "div",
        "order-total",
        money(order.total_amount)
      )
    );

    el.ordersList.appendChild(card);
  }
}

// ==========================================
// INITIALIZATION
// ==========================================

async function initializeApp() {
  // Authentication form switching
  el.showRegisterBtn.addEventListener(
    "click",
    showRegisterForm
  );

  el.showLoginBtn.addEventListener(
    "click",
    showLoginForm
  );

  // Authentication events
  el.loginForm.addEventListener(
    "submit",
    handleLogin
  );

  el.registerForm.addEventListener(
    "submit",
    handleRegister
  );

  el.logoutBtn.addEventListener(
    "click",
    handleLogout
  );

  // Navigation
  document.querySelectorAll(".main-nav a").forEach((link) => {
    link.addEventListener("click", (event) => {
      const page = link.getAttribute("href").replace("#", "");

      if (["products", "cart", "orders"].includes(page)) {
        event.preventDefault();
        navigateTo(page);
      }
    });
  });

  // Browser back/forward and manual hash changes
  window.addEventListener("hashchange", () => {
    const page = window.location.hash.slice(1);
    showPage(page);
  });

  // Products
  el.refreshProducts.addEventListener(
    "click",
    loadProducts
  );

  // Orders
  el.refreshOrders.addEventListener(
    "click",
    loadOrders
  );

  // Checkout
  el.checkoutBtn.addEventListener(
    "click",
    handleCheckout
  );

  // Restore session
  if (API.auth.isAuthenticated()) {
    try {
      await API.auth.me();
    } catch {
      API.auth.clearAuth();
    }
  }

  // Initial page
  updateAuthUI();

  const requestedPage = window.location.hash.slice(1);

  showPage(requestedPage || "products");

  // Load products
  await loadProducts();

  // Load authenticated data
  if (isLoggedIn()) {
    await Promise.all([
      loadCart(),
      loadOrders(),
    ]);
  }
}

document.addEventListener(
  "DOMContentLoaded",
  initializeApp
);
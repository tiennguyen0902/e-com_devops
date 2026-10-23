"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const api = window.ecommerceAPI;

  if (!api) {
    console.error("[ADMIN] ecommerceAPI is unavailable");
    return;
  }

  // ==========================================
  // DOM ELEMENTS
  // ==========================================

  const elements = {
    loginSection: document.getElementById("admin-login-section"),
    loginForm: document.getElementById("admin-login-form"),
    email: document.getElementById("admin-email"),
    password: document.getElementById("admin-password"),

    dashboard: document.getElementById("admin-dashboard"),
    userInfo: document.getElementById("admin-user-info"),
    logoutButton: document.getElementById("admin-logout-btn"),
    notice: document.getElementById("admin-notice"),

    productForm: document.getElementById("admin-product-form"),
    productFormTitle: document.getElementById("admin-product-form-title"),
    productId: document.getElementById("product-id"),
    productName: document.getElementById("product-name"),
    productDescription: document.getElementById("product-description"),
    productPrice: document.getElementById("product-price"),
    productStock: document.getElementById("product-stock"),
    productImage: document.getElementById("product-image-url"),
    productReset: document.getElementById("admin-product-reset"),
    productList: document.getElementById("admin-products-list"),
    refreshProducts: document.getElementById("admin-refresh-products"),

    orderList: document.getElementById("admin-orders-list"),
    refreshOrders: document.getElementById("admin-refresh-orders"),
  };

  const state = {
    user: null,
    products: [],
    orders: [],
  };

  // ==========================================
  // HELPERS
  // ==========================================

  function notify(message, isError = false) {
    elements.notice.textContent = String(message);
    elements.notice.hidden = false;
    elements.notice.style.color = isError ? "#b91c1c" : "#166534";
  }

  function clearNotice() {
    elements.notice.textContent = "";
    elements.notice.hidden = true;
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(Number(value) || 0);
  }

  function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? "—"
      : date.toLocaleString("vi-VN");
  }

  function createCell(value) {
    const td = document.createElement("td");
    td.textContent = String(value ?? "");
    return td;
  }

  function createButton(label, className, callback) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.addEventListener("click", callback);

    return button;
  }

  function showEmptyRow(tbody, columns, message) {
    tbody.replaceChildren();

    const tr = document.createElement("tr");
    const td = createCell(message);

    td.colSpan = columns;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  function extractArray(response) {
    if (Array.isArray(response?.data)) {
      return response.data;
    }

    if (Array.isArray(response?.data?.items)) {
      return response.data.items;
    }

    if (Array.isArray(response?.data?.orders)) {
      return response.data.orders;
    }

    if (Array.isArray(response?.data?.products)) {
      return response.data.products;
    }

    return [];
  }

  function getErrorMessage(error) {
    return error?.message || "Đã xảy ra lỗi. Vui lòng thử lại.";
  }

  function setAuthenticated(user) {
    state.user = user;

    elements.loginSection.hidden = true;
    elements.dashboard.hidden = false;
    elements.logoutButton.hidden = false;

    elements.userInfo.textContent = `${user.name} (Admin)`;
  }

  function setUnauthenticated() {
    state.user = null;
    state.products = [];
    state.orders = [];

    elements.loginSection.hidden = false;
    elements.dashboard.hidden = true;
    elements.logoutButton.hidden = true;

    elements.userInfo.textContent = "";

    elements.password.value = "";
  }

  // ==========================================
  // AUTHENTICATION
  // ==========================================

  async function initializeAuth() {
    setUnauthenticated();

    if (!api.auth.isAuthenticated()) {
      return;
    }

    try {
      const response = await api.auth.me();
      const user = response.data;

      if (!user || user.role !== "admin") {
        setUnauthenticated();
        notify("Tài khoản hiện tại không có quyền quản trị.", true);
        return;
      }

      setAuthenticated(user);
      await loadDashboard();
    } catch (error) {
      api.auth.clearAuth();
      setUnauthenticated();
      notify(getErrorMessage(error), true);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    clearNotice();

    const email = elements.email.value.trim();
    const password = elements.password.value;

    if (!email || !password) {
      notify("Vui lòng nhập email và mật khẩu.", true);
      return;
    }

    const submitButton = elements.loginForm.querySelector(
      'button[type="submit"]'
    );

    submitButton.disabled = true;

    try {
      const response = await api.auth.login(email, password);
      const user = response.data?.user;

      if (!user || user.role !== "admin") {
        api.auth.clearAuth();
        setUnauthenticated();

        notify("Chỉ tài khoản Admin được truy cập trang này.", true);
        return;
      }

      elements.password.value = "";

      setAuthenticated(user);
      notify("Đăng nhập quản trị thành công.");

      await loadDashboard();
    } catch (error) {
      notify(getErrorMessage(error), true);
    } finally {
      submitButton.disabled = false;
    }
  }

  async function handleLogout() {
    try {
      await api.auth.logout();
    } catch (error) {
      console.warn("[ADMIN] Logout request:", error.message);
    } finally {
      api.auth.clearAuth();

      setUnauthenticated();
      notify("Đã đăng xuất.");
    }
  }

  // ==========================================
  // PRODUCTS
  // ==========================================

  async function loadProducts() {
    showEmptyRow(elements.productList, 5, "Đang tải sản phẩm...");

    try {
      const response = await api.products.getAll();

      state.products = extractArray(response);

      renderProducts();
    } catch (error) {
      showEmptyRow(
        elements.productList,
        5,
        "Không thể tải danh sách sản phẩm."
      );

      notify(getErrorMessage(error), true);
    }
  }

  function renderProducts() {
    elements.productList.replaceChildren();

    if (!state.products.length) {
      showEmptyRow(
        elements.productList,
        5,
        "Chưa có sản phẩm."
      );
      return;
    }

    state.products.forEach((product) => {
      const tr = document.createElement("tr");

      tr.appendChild(createCell(product.id));
      tr.appendChild(createCell(product.name));
      tr.appendChild(createCell(formatCurrency(product.price)));
      tr.appendChild(createCell(product.stock));

      const actionCell = document.createElement("td");
      const actionContainer = document.createElement("div");

      actionContainer.className = "table-actions";

      const editButton = createButton(
        "Sửa",
        "btn btn-outline btn-sm",
        () => editProduct(product)
      );

      const deleteButton = createButton(
        "Xóa",
        "btn btn-danger btn-sm",
        () => deleteProduct(product)
      );

      actionContainer.append(editButton, deleteButton);
      actionCell.appendChild(actionContainer);

      tr.appendChild(actionCell);

      elements.productList.appendChild(tr);
    });
  }

  function editProduct(product) {
    elements.productId.value = product.id;
    elements.productName.value = product.name ?? "";
    elements.productDescription.value = product.description ?? "";
    elements.productPrice.value = product.price ?? 0;
    elements.productStock.value = product.stock ?? 0;
    elements.productImage.value = product.image_url ?? "";

    elements.productFormTitle.textContent = "Chỉnh sửa sản phẩm";

    elements.productForm.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function resetProductForm() {
    elements.productForm.reset();

    elements.productId.value = "";
    elements.productFormTitle.textContent = "Thêm sản phẩm";
  }

  async function saveProduct(event) {
    event.preventDefault();
    clearNotice();

    const id = elements.productId.value.trim();

    const productData = {
      name: elements.productName.value.trim(),
      description: elements.productDescription.value.trim(),
      price: Number(elements.productPrice.value),
      stock: Number(elements.productStock.value),
      image_url: elements.productImage.value.trim() || null,
    };

    if (!productData.name) {
      notify("Tên sản phẩm không được để trống.", true);
      return;
    }

    if (
      !Number.isSafeInteger(productData.price) ||
      productData.price < 0
    ) {
      notify("Giá sản phẩm phải là số nguyên không âm.", true);
      return;
    }

    if (
      !Number.isSafeInteger(productData.stock) ||
      productData.stock < 0
    ) {
      notify("Số lượng tồn kho không hợp lệ.", true);
      return;
    }

    const saveButton = document.getElementById("admin-save-product");

    saveButton.disabled = true;

    try {
      if (id) {
        await api.products.update(id, productData);
        notify("Cập nhật sản phẩm thành công.");
      } else {
        await api.products.create(productData);
        notify("Thêm sản phẩm thành công.");
      }

      resetProductForm();
      await loadProducts();
    } catch (error) {
      notify(getErrorMessage(error), true);
    } finally {
      saveButton.disabled = false;
    }
  }

  async function deleteProduct(product) {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa sản phẩm "${product.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.products.remove(product.id);

      notify("Xóa sản phẩm thành công.");
      await loadProducts();
    } catch (error) {
      notify(getErrorMessage(error), true);
    }
  }

  // ==========================================
  // ORDERS
  // ==========================================

  const allowedTransitions = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["shipping", "cancelled"],
    shipping: ["completed"],
    completed: [],
    cancelled: [],
  };

  const statusLabels = {
    pending: "Chờ xác nhận",
    confirmed: "Đã xác nhận",
    shipping: "Đang giao",
    completed: "Hoàn thành",
    cancelled: "Đã hủy",
  };

  async function loadOrders() {
    showEmptyRow(elements.orderList, 6, "Đang tải đơn hàng...");

    try {
      const response = await api.orders.getAll();

      state.orders = extractArray(response);

      renderOrders();
    } catch (error) {
      showEmptyRow(
        elements.orderList,
        6,
        "Không thể tải danh sách đơn hàng."
      );

      notify(getErrorMessage(error), true);
    }
  }

  function renderOrders() {
    elements.orderList.replaceChildren();

    if (!state.orders.length) {
      showEmptyRow(
        elements.orderList,
        6,
        "Chưa có đơn hàng."
      );
      return;
    }

    state.orders.forEach((order) => {
      const tr = document.createElement("tr");

      tr.appendChild(createCell(order.id));

      const customerName =
        order.customer_name ||
        order.user_name ||
        order.email ||
        (order.user_id ? `User #${order.user_id}` : "—");

      tr.appendChild(createCell(customerName));

      tr.appendChild(
        createCell(formatCurrency(order.total_amount))
      );

      tr.appendChild(
        createCell(statusLabels[order.status] || order.status)
      );

      tr.appendChild(createCell(formatDate(order.created_at)));

      const actionCell = document.createElement("td");

      const nextStatuses = allowedTransitions[order.status] || [];

      if (!nextStatuses.length) {
        actionCell.textContent = "—";
      } else {
        const select = document.createElement("select");

        select.setAttribute(
          "aria-label",
          `Trạng thái mới cho đơn hàng ${order.id}`
        );

        const placeholder = document.createElement("option");

        placeholder.value = "";
        placeholder.textContent = "Chọn trạng thái";

        select.appendChild(placeholder);

        nextStatuses.forEach((status) => {
          const option = document.createElement("option");

          option.value = status;
          option.textContent = statusLabels[status];

          select.appendChild(option);
        });

        const button = createButton(
          "Cập nhật",
          "btn btn-primary btn-sm",
          async () => {
            if (!select.value) {
              notify("Vui lòng chọn trạng thái mới.", true);
              return;
            }

            button.disabled = true;

            try {
              await changeOrderStatus(order, select.value);
            } finally {
              button.disabled = false;
            }
          }
        );

        const container = document.createElement("div");

        container.className = "table-actions";
        container.append(select, button);

        actionCell.appendChild(container);
      }

      tr.appendChild(actionCell);

      elements.orderList.appendChild(tr);
    });
  }

  async function changeOrderStatus(order, newStatus) {
    const confirmed = window.confirm(
      `Cập nhật đơn hàng #${order.id} sang "${statusLabels[newStatus]}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.orders.updateStatus(order.id, newStatus);

      notify(`Cập nhật đơn hàng #${order.id} thành công.`);

      await loadOrders();
      await loadProducts();
    } catch (error) {
      notify(getErrorMessage(error), true);
    }
  }

  // ==========================================
  // DASHBOARD
  // ==========================================

  async function loadDashboard() {
    await Promise.all([
      loadProducts(),
      loadOrders(),
    ]);
  }

  // ==========================================
  // EVENTS
  // ==========================================

  elements.loginForm.addEventListener("submit", handleLogin);

  elements.logoutButton.addEventListener("click", handleLogout);

  elements.productForm.addEventListener("submit", saveProduct);

  elements.productReset.addEventListener("click", resetProductForm);

  elements.refreshProducts.addEventListener("click", loadProducts);

  elements.refreshOrders.addEventListener("click", loadOrders);

  // ==========================================
  // INITIALIZATION
  // ==========================================

  initializeAuth();
});
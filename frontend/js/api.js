
"use strict";

// ==========================================
// E-COMMERCE API CLIENT
// ==========================================

const API_BASE_URL = "/api";

const TOKEN_KEY = "ecommerce_token";
const USER_KEY = "ecommerce_user";

// ==========================================
// AUTH STORAGE
// ==========================================

function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (typeof token !== "string" || !token) {
    throw new Error("Invalid authentication token");
  }

  sessionStorage.setItem(TOKEN_KEY, token);
}

function getStoredUser() {
  try {
    const value = sessionStorage.getItem(USER_KEY);

    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function setStoredUser(user) {
  sessionStorage.setItem(
    USER_KEY,
    JSON.stringify(user)
  );
}

function clearAuth() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

function isAuthenticated() {
  return Boolean(getToken());
}

function isAdmin() {
  return getStoredUser()?.role === "admin";
}

// ==========================================
// HTTP REQUEST HANDLER
// ==========================================

async function apiRequest(endpoint, options = {}) {
  const token = getToken();

  const headers = {
    Accept: "application/json",
    ...options.headers,
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(
      `${API_BASE_URL}${endpoint}`,
      {
        method: options.method || "GET",
        headers,
        body:
          options.body !== undefined
            ? JSON.stringify(options.body)
            : undefined,
        credentials: "same-origin",
      }
    );
  } catch {
    throw new Error(
      "Không thể kết nối đến máy chủ. Vui lòng thử lại."
    );
  }

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error(
      "Phản hồi từ máy chủ không hợp lệ"
    );
  }

  if (!response.ok || result.success === false) {
    if (response.status === 401 && token) {
      clearAuth();
    }

    const error = new Error(
      result.message || "Yêu cầu thất bại"
    );

    error.status = response.status;

    throw error;
  }

  return result;
}

// ==========================================
// AUTHENTICATION API
// ==========================================

const authAPI = {
  async register(data) {
    return apiRequest("/auth/register", {
      method: "POST",
      body: data,
    });
  },

  async login(email, password) {
    const result = await apiRequest("/auth/login", {
      method: "POST",
      body: { email, password },
    });

    setToken(result.data.token);
    setStoredUser(result.data.user);

    return result;
  },

  async me() {
    const result = await apiRequest("/auth/me");

    setStoredUser(result.data);

    return result;
  },

  async logout() {
    try {
      if (getToken()) {
        await apiRequest("/auth/logout", {
          method: "POST",
        });
      }
    } finally {
      clearAuth();
    }
  },

  getToken,
  getStoredUser,
  clearAuth,
  isAuthenticated,
  isAdmin,
};

// ==========================================
// PRODUCT API
// ==========================================

const productAPI = {
  getAll() {
    return apiRequest("/products");
  },

  getById(id) {
    return apiRequest(`/products/${encodeURIComponent(id)}`);
  },

  create(data) {
    return apiRequest("/products", {
      method: "POST",
      body: data,
    });
  },

  update(id, data) {
    return apiRequest(`/products/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: data,
    });
  },

  remove(id) {
    return apiRequest(`/products/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
};

// ==========================================
// CART API
// ==========================================

const cartAPI = {
  get() {
    return apiRequest("/cart");
  },

  add(productId, quantity) {
    return apiRequest("/cart", {
      method: "POST",
      body: {
        product_id: productId,
        quantity,
      },
    });
  },

  update(productId, quantity) {
    return apiRequest(
      `/cart/${encodeURIComponent(productId)}`,
      {
        method: "PUT",
        body: { quantity },
      }
    );
  },

  remove(productId) {
    return apiRequest(
      `/cart/${encodeURIComponent(productId)}`,
      {
        method: "DELETE",
      }
    );
  },
};

// ==========================================
// ORDER API
// ==========================================

const orderAPI = {
  create() {
    return apiRequest("/orders", {
      method: "POST",
      body: {},
    });
  },

  getAll() {
    return apiRequest("/orders");
  },

  getById(id) {
    return apiRequest(`/orders/${encodeURIComponent(id)}`);
  },

  updateStatus(id, status) {
    return apiRequest(
      `/orders/${encodeURIComponent(id)}/status`,
      {
        method: "PATCH",
        body: { status },
      }
    );
  },
};

// ==========================================
// GLOBAL API OBJECT
// ==========================================

window.ecommerceAPI = {
  auth: authAPI,
  products: productAPI,
  cart: cartAPI,
  orders: orderAPI,
};

(() => {
  "use strict";

  const BASE_URL = "/api";
  const TIMEOUT_MS = 8000;

  class ApiError extends Error {
    constructor(message, status = 0, detail = "") {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.detail = detail;
    }
  }

  async function request(path, options = {}) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
    const headers = { Accept: "application/json", ...(options.headers || {}) };
    let body = options.body;
    if (body !== undefined && body !== null && typeof body !== "string") {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(body);
    }

    try {
      const response = await fetch(`${BASE_URL}${path}`, {
        ...options,
        body,
        headers,
        credentials: "same-origin",
        signal: controller.signal,
        cache: "no-store",
      });

      const text = await response.text();
      let data = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = null;
        }
      }

      if (!response.ok) {
        let detail = "";
        if (data && typeof data.detail === "string") {
          detail = data.detail;
        } else if (data && Array.isArray(data.detail)) {
          detail = data.detail
            .map((entry) => entry.msg || "参数不正确")
            .join("；");
        }
        const message =
          detail ||
          (response.status === 429
            ? "尝试次数过多，请稍后再试。"
            : response.status >= 500
              ? "服务器暂时不可用，请稍后重试。"
              : "请求没有成功，请检查输入后重试。");
        if (response.status === 401 && !path.startsWith("/auth/")) {
          window.dispatchEvent(new CustomEvent("shizhi:unauthorized"));
        }
        throw new ApiError(message, response.status, detail);
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error.name === "AbortError") {
        throw new ApiError("请求超时，请检查数据库服务是否正常。", 0);
      }
      throw new ApiError("无法连接数据服务，请确认 Docker 容器正在运行。", 0);
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function list() {
    const data = await request("/knowledge");
    return data && Array.isArray(data.items) ? data.items : [];
  }

  function create(payload) {
    return request("/knowledge", { method: "POST", body: payload });
  }

  function update(id, payload) {
    return request(`/knowledge/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: payload,
    });
  }

  function remove(id) {
    return request(`/knowledge/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  function setFavorite(id, favorite) {
    return request(`/knowledge/${encodeURIComponent(id)}/favorite`, {
      method: "PATCH",
      body: { favorite },
    });
  }

  function setMastered(id, mastered) {
    return request(`/knowledge/${encodeURIComponent(id)}/mastered`, {
      method: "PATCH",
      body: { mastered },
    });
  }

  function importItems(items) {
    return request("/knowledge/import", {
      method: "POST",
      body: { items },
    });
  }

  function register(payload) {
    return request("/auth/register", { method: "POST", body: payload });
  }

  function login(payload) {
    return request("/auth/login", { method: "POST", body: payload });
  }

  function me() {
    return request("/auth/me");
  }

  function logout() {
    return request("/auth/logout", { method: "POST" });
  }

  window.KnowledgeAPI = {
    list,
    create,
    update,
    remove,
    setFavorite,
    setMastered,
    importItems,
    register,
    login,
    me,
    logout,
    ApiError,
  };
})();

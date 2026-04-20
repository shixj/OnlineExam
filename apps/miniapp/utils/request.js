const { API_BASE, REQUEST_TIMEOUT } = require("../config/env");
const { getAuthState, handleAuthExpired } = require("./auth");

function buildUrl(path, query) {
  const base = `${API_BASE}${path}`;
  if (!query || Object.keys(query).length === 0) {
    return base;
  }

  const search = Object.keys(query)
    .filter((key) => query[key] !== undefined && query[key] !== null && query[key] !== "")
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(query[key]))}`)
    .join("&");

  return search ? `${base}?${search}` : base;
}

function request(options) {
  const {
    path,
    method = "GET",
    data,
    auth = true,
    header = {},
  } = options;

  const headers = { ...header };
  if (auth) {
    const token = getAuthState() && getAuthState().token;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  if (data !== undefined && method !== "GET" && !headers["content-type"]) {
    headers["content-type"] = "application/json";
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: buildUrl(path, method === "GET" ? data : undefined),
      method,
      data: method === "GET" ? undefined : data,
      timeout: REQUEST_TIMEOUT,
      header: headers,
      success(response) {
        const responseData = response.data || {};
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(responseData);
          return;
        }

        const message = responseData.message || "请求失败";
        if (response.statusCode === 401 && auth) {
          handleAuthExpired(message);
          reject(new Error(message));
          return;
        }

        reject(new Error(message));
      },
      fail(error) {
        reject(new Error(error.errMsg || "网络请求失败"));
      },
    });
  });
}

module.exports = {
  request,
};

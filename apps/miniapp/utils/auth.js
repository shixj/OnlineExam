const { STORAGE_KEYS, getStorage, setStorage, removeStorage } = require("./storage");

function getAppInstance() {
  try {
    return getApp();
  } catch {
    return null;
  }
}

function restoreAuthState() {
  const auth = getStorage(STORAGE_KEYS.auth, null);
  const app = getAppInstance();
  if (app && app.globalData) {
    app.globalData.auth = auth;
  }
  return auth;
}

function getAuthState() {
  const app = getAppInstance();
  if (app && app.globalData && app.globalData.auth) {
    return app.globalData.auth;
  }
  return restoreAuthState();
}

function setAuthState(auth) {
  setStorage(STORAGE_KEYS.auth, auth);
  const app = getAppInstance();
  if (app && app.globalData) {
    app.globalData.auth = auth;
  }
  return auth;
}

function clearAuthState() {
  removeStorage(STORAGE_KEYS.auth);
  removeStorage(STORAGE_KEYS.activeSession);
  removeStorage(STORAGE_KEYS.resultSnapshot);
  const app = getAppInstance();
  if (app && app.globalData) {
    app.globalData.auth = null;
    app.globalData.resultSnapshot = null;
  }
}

function isLoggedIn() {
  const auth = getAuthState();
  return Boolean(auth && auth.token);
}

function redirectToLogin(message) {
  if (message) {
    wx.showToast({
      title: message,
      icon: "none",
      duration: 2200,
    });
  }

  const pages = getCurrentPages();
  const current = pages[pages.length - 1];
  const currentRoute = current && current.route ? `/${current.route}` : "/pages/home/index";
  wx.reLaunch({
    url: `/pages/login/index?redirect=${encodeURIComponent(currentRoute)}`,
  });
}

function requireLogin() {
  const auth = getAuthState();
  if (!auth || !auth.token) {
    redirectToLogin("请先登录");
    return null;
  }
  return auth;
}

function handleAuthExpired(message = "登录已过期，请重新登录") {
  clearAuthState();
  redirectToLogin(message);
}

module.exports = {
  restoreAuthState,
  getAuthState,
  setAuthState,
  clearAuthState,
  isLoggedIn,
  requireLogin,
  redirectToLogin,
  handleAuthExpired,
};

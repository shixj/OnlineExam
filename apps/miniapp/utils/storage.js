const STORAGE_KEYS = {
  auth: "miniapp-auth",
  activeSession: "miniapp-active-session",
  resultSnapshot: "miniapp-result-snapshot",
};

function getStorage(key, fallback = null) {
  try {
    const value = wx.getStorageSync(key);
    return value === "" || value == null ? fallback : value;
  } catch (error) {
    console.warn("读取本地缓存失败", key, error);
    return fallback;
  }
}

function setStorage(key, value) {
  try {
    wx.setStorageSync(key, value);
  } catch (error) {
    console.warn("写入本地缓存失败", key, error);
  }
}

function removeStorage(key) {
  try {
    wx.removeStorageSync(key);
  } catch (error) {
    console.warn("删除本地缓存失败", key, error);
  }
}

module.exports = {
  STORAGE_KEYS,
  getStorage,
  setStorage,
  removeStorage,
};

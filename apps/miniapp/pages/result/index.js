const { requireLogin } = require("../../utils/auth");
const { STORAGE_KEYS, getStorage, removeStorage } = require("../../utils/storage");
const { formatSessionStatus } = require("../../utils/labels");

Page({
  data: {
    result: null,
  },
  onShow() {
    if (!requireLogin()) return;

    const app = getApp();
    const result = app.globalData.resultSnapshot || getStorage(STORAGE_KEYS.resultSnapshot, null);
    this.setData({
      result: result
        ? {
            ...result,
            statusLabel: formatSessionStatus(result.status),
          }
        : null,
    });
  },
  backHome() {
    getApp().globalData.resultSnapshot = null;
    removeStorage(STORAGE_KEYS.resultSnapshot);
    wx.switchTab({
      url: "/pages/home/index",
    });
  },
  viewHistory() {
    getApp().globalData.resultSnapshot = null;
    removeStorage(STORAGE_KEYS.resultSnapshot);
    wx.switchTab({
      url: "/pages/history/index",
    });
  },
});

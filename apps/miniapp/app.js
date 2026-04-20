const { restoreAuthState } = require("./utils/auth");

App({
  globalData: {
    auth: null,
    systemInfo: null,
    isTablet: false,
    resultSnapshot: null,
  },
  onLaunch() {
    this.globalData.auth = restoreAuthState();

    try {
      const systemInfo = wx.getSystemInfoSync();
      this.globalData.systemInfo = systemInfo;
      this.globalData.isTablet = systemInfo.model.includes("iPad") || systemInfo.screenWidth >= 768;
    } catch (error) {
      console.warn("读取设备信息失败", error);
    }
  },
});

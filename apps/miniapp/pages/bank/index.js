const api = require("../../utils/api");
const { requireLogin } = require("../../utils/auth");
const { STORAGE_KEYS, setStorage } = require("../../utils/storage");

function saveActiveSession(payload) {
  setStorage(STORAGE_KEYS.activeSession, payload);
}

Page({
  data: {
    bankId: "",
    summary: null,
    loading: true,
    actionLoading: "",
    error: "",
  },
  onLoad(options) {
    this.setData({
      bankId: (options && options.bankId) || "",
    });
  },
  onShow() {
    if (!this.data.bankId) {
      this.setData({
        loading: false,
        error: "缺少题库参数",
      });
      return;
    }

    void this.loadSummary();
  },
  async loadSummary() {
    if (!requireLogin()) return;

    this.setData({
      loading: true,
      error: "",
    });

    try {
      const summary = await api.getBankSummary(this.data.bankId);
      this.setData({
        summary: {
          ...summary,
          categories: (summary.categories || []).map((item) => ({
            ...item,
            loadingKey: `category:${item.category}`,
          })),
        },
      });
    } catch (error) {
      this.setData({
        error: error.message || "题库详情加载失败",
      });
    } finally {
      this.setData({ loading: false });
    }
  },
  async createNormalPractice(category) {
    const normalizedCategory = typeof category === "string" ? category : "";
    this.setData({ actionLoading: normalizedCategory ? `category:${normalizedCategory}` : "normal" });
    try {
      const session = await api.createPracticeSession({
        bankId: this.data.bankId,
        mode: "normal",
        category: normalizedCategory,
      });
      saveActiveSession({
        sessionId: session.sessionId,
        bankId: this.data.bankId,
        mode: "normal",
        category: normalizedCategory,
      });
      wx.navigateTo({
        url: `/pages/practice/index?sessionId=${session.sessionId}`,
      });
    } catch (error) {
      wx.showToast({
        title: error.message || "无法开始练习",
        icon: "none",
      });
    } finally {
      this.setData({ actionLoading: "" });
    }
  },
  startNormalPractice() {
    void this.createNormalPractice("");
  },
  async continuePractice() {
    this.setData({ actionLoading: "continue" });
    try {
      const latest = await api.getLatestPracticeSession({
        bankId: this.data.bankId,
        mode: "normal",
      });

      if (latest.session && latest.session.id) {
        saveActiveSession({
          sessionId: latest.session.id,
          bankId: this.data.bankId,
          mode: "normal",
          category: "",
        });
        wx.navigateTo({
          url: `/pages/practice/index?sessionId=${latest.session.id}`,
        });
        return;
      }

      await this.createNormalPractice("");
    } catch (error) {
      wx.showToast({
        title: error.message || "无法继续上次练习",
        icon: "none",
      });
    } finally {
      this.setData({ actionLoading: "" });
    }
  },
  async createWrongPractice() {
    this.setData({ actionLoading: "wrong" });
    try {
      const session = await api.createWrongPracticeSession({
        bankId: this.data.bankId,
      });
      saveActiveSession({
        sessionId: session.sessionId,
        bankId: this.data.bankId,
        mode: "wrong_only",
        category: "",
      });
      wx.navigateTo({
        url: `/pages/practice/index?sessionId=${session.sessionId}`,
      });
    } catch (error) {
      wx.showToast({
        title: error.message || "当前没有待练习错题",
        icon: "none",
      });
    } finally {
      this.setData({ actionLoading: "" });
    }
  },
  openWrongQuestions() {
    const name = this.data.summary ? this.data.summary.name : "当前题库";
    wx.navigateTo({
      url: `/pages/wrong/index?bankId=${this.data.bankId}&name=${encodeURIComponent(name)}`,
    });
  },
  startCategoryPractice(event) {
    const category = event.currentTarget.dataset.category;
    void this.createNormalPractice(category);
  },
});

const api = require("../../utils/api");
const { requireLogin } = require("../../utils/auth");
const { STORAGE_KEYS, removeStorage, setStorage } = require("../../utils/storage");
const { formatDate, formatSessionMode, formatSessionStatus } = require("../../utils/labels");

Page({
  data: {
    loading: true,
    clearing: false,
    error: "",
    history: [],
  },
  onShow() {
    void this.loadHistory();
  },
  async loadHistory() {
    if (!requireLogin()) return;

    this.setData({
      loading: true,
      error: "",
    });

    try {
      const items = await api.getPracticeHistory();
      const history = items.map((item) => ({
        ...item,
        modeLabel: formatSessionMode(item.mode),
        statusLabel: formatSessionStatus(item.status),
        startedAtText: formatDate(item.started_at),
        submittedAtText: formatDate(item.submitted_at),
        statusClass: item.status === "completed" ? "status-tag status-tag--success" : "status-tag status-tag--active",
        actionLabel: item.status === "completed" ? "查看结果" : item.status === "in_progress" ? "继续作答" : "查看记录",
      }));

      this.setData({ history });
    } catch (error) {
      this.setData({
        error: error.message || "历史记录加载失败",
      });
    } finally {
      this.setData({
        loading: false,
      });
    }
  },
  async confirmClearHistory() {
    if (!this.data.history.length || this.data.clearing) return;

    const modalResult = await wx.showModal({
      title: "确认清空历史记录",
      content: "清空后将删除当前账号的练习历史、答题记录和错题库，且无法恢复。是否继续？",
      confirmText: "确认清空",
      confirmColor: "#dc2626",
      cancelText: "取消",
    });

    if (!modalResult.confirm) {
      return;
    }

    this.setData({ clearing: true });
    try {
      await api.clearPracticeHistory();
      this.setData({
        history: [],
        error: "",
      });
      wx.showToast({
        title: "已清空历史记录",
        icon: "success",
      });
    } catch (error) {
      wx.showToast({
        title: error.message || "清空失败",
        icon: "none",
      });
    } finally {
      this.setData({ clearing: false });
    }
  },
  async openHistoryItem(event) {
    const { sessionId, status } = event.currentTarget.dataset;
    if (!sessionId) return;

    try {
      if (status === "in_progress") {
        await api.getCurrentPracticeQuestion(sessionId);
        setStorage(STORAGE_KEYS.activeSession, { sessionId });
        wx.navigateTo({
          url: `/pages/practice/index?sessionId=${sessionId}`,
        });
        return;
      }

      if (status === "completed") {
        const record = this.data.history.find((item) => item.id === sessionId);
        if (!record) return;

        const app = getApp();
        app.globalData.resultSnapshot = record;
        setStorage(STORAGE_KEYS.resultSnapshot, record);
        removeStorage(STORAGE_KEYS.activeSession);
        wx.navigateTo({
          url: "/pages/result/index",
        });
        return;
      }

      wx.showToast({
        title: "当前记录暂不支持打开",
        icon: "none",
      });
    } catch (error) {
      wx.showToast({
        title: error.message || "打开记录失败",
        icon: "none",
      });
    }
  },
});

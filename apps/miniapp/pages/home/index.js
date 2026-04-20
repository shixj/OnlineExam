const api = require("../../utils/api");
const { requireLogin, clearAuthState } = require("../../utils/auth");

Page({
  data: {
    user: null,
    banks: [],
    loading: true,
    error: "",
    stats: {
      bankCount: 0,
      totalQuestions: 0,
      activeCount: 0,
      wrongCount: 0,
    },
  },
  onShow() {
    void this.bootstrap();
  },
  async bootstrap() {
    const auth = requireLogin();
    if (!auth) return;

    this.setData({
      user: auth.user,
      loading: true,
      error: "",
    });

    try {
      const banks = await api.getQuestionBanks();
      const stats = banks.reduce((accumulator, bank) => ({
        bankCount: accumulator.bankCount + 1,
        totalQuestions: accumulator.totalQuestions + Number(bank.totalCount || 0),
        activeCount: accumulator.activeCount + (Number(bank.unresolvedWrongCount || 0) > 0 ? 1 : 0),
        wrongCount: accumulator.wrongCount + Number(bank.unresolvedWrongCount || 0),
      }), {
        bankCount: 0,
        totalQuestions: 0,
        activeCount: 0,
        wrongCount: 0,
      });

      this.setData({
        banks,
        stats,
      });
    } catch (error) {
      this.setData({
        error: error.message || "题库加载失败",
      });
    } finally {
      this.setData({
        loading: false,
      });
    }
  },
  openBank(event) {
    const { bankId } = event.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/bank/index?bankId=${bankId}`,
    });
  },
  goHistory() {
    wx.switchTab({
      url: "/pages/history/index",
    });
  },
  async handleLogout() {
    const modalResult = await wx.showModal({
      title: "确认退出登录",
      content: "退出后将返回登录页，如需继续练习需要重新登录。是否继续？",
      confirmText: "退出登录",
      confirmColor: "#dc2626",
      cancelText: "取消",
    });

    if (!modalResult.confirm) {
      return;
    }

    clearAuthState();
    wx.reLaunch({
      url: "/pages/login/index",
    });
  },
});

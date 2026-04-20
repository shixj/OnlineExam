const api = require("../../utils/api");
const { requireLogin } = require("../../utils/auth");
const { STORAGE_KEYS, setStorage } = require("../../utils/storage");
const { formatAnswerByOptions, formatQuestionType, formatDate } = require("../../utils/labels");

Page({
  data: {
    bankId: "",
    bankName: "当前题库",
    loading: true,
    actionLoading: false,
    error: "",
    wrongQuestions: [],
  },
  onLoad(options) {
    this.setData({
      bankId: (options && options.bankId) || "",
      bankName: options && options.name ? decodeURIComponent(options.name) : "当前题库",
    });
  },
  onShow() {
    void this.loadWrongQuestions();
  },
  async loadWrongQuestions() {
    if (!requireLogin()) return;

    if (!this.data.bankId) {
      this.setData({
        loading: false,
        error: "缺少题库参数",
      });
      return;
    }

    this.setData({
      loading: true,
      error: "",
    });

    try {
      const wrongQuestions = await api.getWrongQuestions(this.data.bankId);
      const mapped = wrongQuestions.map((item) => ({
        ...item,
        questionTypeLabel: formatQuestionType(item.question.questionType),
        correctAnswerText: formatAnswerByOptions(item.correctAnswer, item.question.options),
        lastWrongAtText: formatDate(item.lastWrongAt),
      }));

      this.setData({
        wrongQuestions: mapped,
      });
    } catch (error) {
      this.setData({
        error: error.message || "错题列表加载失败",
      });
    } finally {
      this.setData({
        loading: false,
      });
    }
  },
  async startWrongPractice() {
    this.setData({ actionLoading: true });
    try {
      const session = await api.createWrongPracticeSession({
        bankId: this.data.bankId,
      });
      setStorage(STORAGE_KEYS.activeSession, {
        sessionId: session.sessionId,
        bankId: this.data.bankId,
        mode: "wrong_only",
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
      this.setData({ actionLoading: false });
    }
  },
});

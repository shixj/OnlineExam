const api = require("../../utils/api");
const { requireLogin } = require("../../utils/auth");
const { STORAGE_KEYS, getStorage, setStorage, removeStorage } = require("../../utils/storage");
const { formatAnswerByOptions, formatQuestionType } = require("../../utils/labels");

function mapQuestion(question, selectedAnswer) {
  if (!question) return null;

  return {
    ...question,
    questionTypeLabel: formatQuestionType(question.questionType),
    options: (question.options || []).map((option) => ({
      ...option,
      active: selectedAnswer === option.key,
      itemClass: selectedAnswer === option.key ? "option-item option-item--active" : "option-item",
    })),
  };
}

function mapProgress(progress, currentQuestionId) {
  if (!progress) return null;

  return {
    ...progress,
    items: (progress.items || []).map((item) => {
      let itemClass = "tracker-item";
      if (item.status === "correct") itemClass = "tracker-item tracker-item--correct";
      if (item.status === "wrong") itemClass = "tracker-item tracker-item--wrong";
      if (item.questionId === currentQuestionId && item.status === "pending") itemClass = "tracker-item tracker-item--current";

      return {
        ...item,
        itemClass,
        isAnswered: item.status !== "pending",
      };
    }),
  };
}

function mapReview(detail) {
  if (!detail) return null;

  const userAnswerText = detail.userAnswer
    ? formatAnswerByOptions(detail.userAnswer, detail.question.options)
    : "未作答";
  const correctAnswerText = formatAnswerByOptions(detail.correctAnswer, detail.question.options);

  return {
    ...detail,
    questionTypeLabel: formatQuestionType(detail.question.questionType),
    userAnswerText,
    correctAnswerText,
    userAnswerClass: detail.isCorrect ? "answer-correct" : "answer-wrong",
  };
}

Page({
  data: {
    sessionId: "",
    loading: true,
    submitting: false,
    currentQuestion: null,
    progress: null,
    selectedAnswer: "",
    submitFeedback: null,
    submitFeedbackClass: "submit-feedback submit-feedback--hidden",
    reviewQuestion: null,
    reviewVisible: false,
    questionStartedAt: 0,
  },
  clearFeedbackTimers() {
    if (this.feedbackFadeTimer) {
      clearTimeout(this.feedbackFadeTimer);
      this.feedbackFadeTimer = null;
    }

    if (this.feedbackRemoveTimer) {
      clearTimeout(this.feedbackRemoveTimer);
      this.feedbackRemoveTimer = null;
    }
  },
  showSubmitFeedback(feedback) {
    this.clearFeedbackTimers();

    this.setData({
      submitFeedback: feedback,
      submitFeedbackClass: `${feedback.containerClass} submit-feedback--visible`,
    });

    this.feedbackFadeTimer = setTimeout(() => {
      this.setData({
        submitFeedbackClass: `${feedback.containerClass} submit-feedback--hidden`,
      });
    }, 3000);

    this.feedbackRemoveTimer = setTimeout(() => {
      this.setData({
        submitFeedback: null,
      });
    }, 3360);
  },
  onLoad(options) {
    const cached = getStorage(STORAGE_KEYS.activeSession, null);
    this.setData({
      sessionId: (options && options.sessionId) || (cached && cached.sessionId) || "",
    });
  },
  onUnload() {
    this.clearFeedbackTimers();
  },
  onShow() {
    void this.bootstrap();
  },
  async bootstrap() {
    if (!requireLogin()) return;

    if (!this.data.sessionId) {
      wx.showToast({
        title: "缺少练习会话",
        icon: "none",
      });
      return;
    }

    await this.loadCurrentQuestion();
  },
  async loadCurrentQuestion() {
    this.setData({ loading: true });
    try {
      const response = await api.getCurrentPracticeQuestion(this.data.sessionId);
      this.applyPracticeState(response.question, response.progress, "");
      setStorage(STORAGE_KEYS.activeSession, {
        sessionId: this.data.sessionId,
      });
    } catch (error) {
      wx.showToast({
        title: error.message || "题目加载失败",
        icon: "none",
      });
    } finally {
      this.setData({ loading: false });
    }
  },
  applyPracticeState(question, progress, selectedAnswer) {
    const currentQuestionId = this.data.currentQuestion ? this.data.currentQuestion.questionId : "";
    const nextQuestionId = question ? question.questionId : "";
    const nextStartedAt = nextQuestionId && nextQuestionId === currentQuestionId
      ? this.data.questionStartedAt
      : (question ? Date.now() : 0);

    this.setData({
      selectedAnswer,
      currentQuestion: mapQuestion(question, selectedAnswer),
      progress: mapProgress(progress, question ? question.questionId : ""),
      reviewQuestion: null,
      reviewVisible: false,
      questionStartedAt: nextStartedAt,
    });
  },
  selectAnswer(event) {
    const answer = event.currentTarget.dataset.key;
    this.applyPracticeState(this.data.currentQuestion, this.data.progress, answer);
  },
  async submitAnswer() {
    if (!this.data.currentQuestion || !this.data.selectedAnswer) {
      wx.showToast({
        title: "请选择答案后再提交",
        icon: "none",
      });
      return;
    }

    this.setData({ submitting: true });
    try {
      const answeredQuestion = this.data.currentQuestion;
      const answeredText = formatAnswerByOptions(this.data.selectedAnswer, answeredQuestion.options);
      const elapsedMs = this.data.questionStartedAt ? Date.now() - this.data.questionStartedAt : 0;
      const durationSeconds = Math.max(1, Math.round(elapsedMs / 1000));
      const response = await api.submitPracticeAnswer(this.data.sessionId, {
        questionId: answeredQuestion.questionId,
        userAnswer: this.data.selectedAnswer,
        durationSeconds,
      });

      const correctAnswerText = formatAnswerByOptions(response.correctAnswer, answeredQuestion.options);
      const feedback = {
        questionLabel: answeredQuestion.sourceNo || answeredQuestion.index,
        isCorrect: response.isCorrect,
        title: response.isCorrect ? "回答正确" : "回答错误",
        containerClass: response.isCorrect ? "submit-feedback submit-feedback--success" : "submit-feedback submit-feedback--error",
        titleClass: response.isCorrect ? "submit-feedback__title answer-correct" : "submit-feedback__title answer-wrong",
        answeredText,
        correctAnswerText,
      };

      this.showSubmitFeedback(feedback);

      if (response.completed) {
        const result = await api.submitPracticeSession(this.data.sessionId);
        const app = getApp();
        app.globalData.resultSnapshot = result;
        setStorage(STORAGE_KEYS.resultSnapshot, result);
        removeStorage(STORAGE_KEYS.activeSession);
        wx.redirectTo({
          url: "/pages/result/index",
        });
        return;
      }

      this.applyPracticeState(response.nextQuestion, response.progress, "");
    } catch (error) {
      wx.showToast({
        title: error.message || "提交失败",
        icon: "none",
      });
    } finally {
      this.setData({ submitting: false });
    }
  },
  async reviewAnsweredQuestion(event) {
    const { questionId, answered } = event.currentTarget.dataset;
    if (String(answered) !== "true" && Number(answered) !== 1) return;

    try {
      const detail = await api.getPracticeQuestionReview(this.data.sessionId, questionId);
      this.setData({
        reviewQuestion: mapReview(detail),
        reviewVisible: true,
      });
    } catch (error) {
      wx.showToast({
        title: error.message || "回看失败",
        icon: "none",
      });
    }
  },
  closeReview() {
    this.setData({
      reviewVisible: false,
      reviewQuestion: null,
    });
  },
});

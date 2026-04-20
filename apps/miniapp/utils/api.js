const { request } = require("./request");

function login(payload) {
  return request({
    path: "/api/app/login",
    method: "POST",
    auth: false,
    data: payload,
  });
}

function getQuestionBanks() {
  return request({
    path: "/api/app/question-banks",
  });
}

function getBankSummary(bankId) {
  return request({
    path: `/api/app/question-banks/${bankId}/summary`,
  });
}

function getLatestPracticeSession(params) {
  return request({
    path: "/api/app/practice-sessions/latest",
    data: params,
  });
}

function createPracticeSession(payload) {
  return request({
    path: "/api/app/practice-sessions",
    method: "POST",
    data: payload,
  });
}

function createWrongPracticeSession(payload) {
  return request({
    path: "/api/app/wrong-practice-sessions",
    method: "POST",
    data: payload,
  });
}

function getCurrentPracticeQuestion(sessionId) {
  return request({
    path: `/api/app/practice-sessions/${sessionId}/current`,
  });
}

function submitPracticeAnswer(sessionId, payload) {
  return request({
    path: `/api/app/practice-sessions/${sessionId}/answer`,
    method: "POST",
    data: payload,
  });
}

function submitPracticeSession(sessionId) {
  return request({
    path: `/api/app/practice-sessions/${sessionId}/submit`,
    method: "POST",
    data: {},
  });
}

function getPracticeQuestionReview(sessionId, questionId) {
  return request({
    path: `/api/app/practice-sessions/${sessionId}/questions/${questionId}`,
  });
}

function getPracticeHistory() {
  return request({
    path: "/api/app/practice-sessions/history",
  });
}

function clearPracticeHistory() {
  return request({
    path: "/api/app/practice-sessions/history/clear",
    method: "POST",
    data: {},
  });
}

function getWrongQuestions(bankId) {
  return request({
    path: "/api/app/wrong-questions",
    data: { bankId },
  });
}

module.exports = {
  login,
  getQuestionBanks,
  getBankSummary,
  getLatestPracticeSession,
  createPracticeSession,
  createWrongPracticeSession,
  getCurrentPracticeQuestion,
  submitPracticeAnswer,
  submitPracticeSession,
  getPracticeQuestionReview,
  getPracticeHistory,
  clearPracticeHistory,
  getWrongQuestions,
};

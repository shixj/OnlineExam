function formatSessionMode(mode) {
  if (mode === "normal") return "顺序练习";
  if (mode === "wrong_only") return "错题练习";
  return mode || "-";
}

function formatSessionStatus(status) {
  if (status === "in_progress") return "进行中";
  if (status === "completed") return "已完成";
  if (status === "abandoned") return "已中断";
  return status || "-";
}

function formatQuestionType(questionType) {
  if (questionType === "single") return "单选题";
  if (questionType === "judge") return "判断题";
  return questionType || "-";
}

function formatAnswerByOptions(answer, options) {
  const matched = (options || []).find((item) => item.key === answer);
  return matched ? `${answer}：${matched.text}` : answer || "-";
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hour}:${minute}`;
}

module.exports = {
  formatSessionMode,
  formatSessionStatus,
  formatQuestionType,
  formatAnswerByOptions,
  formatDate,
};

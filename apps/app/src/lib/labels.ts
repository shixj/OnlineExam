type OptionLike = {
  key: string;
  text: string;
};

export function formatSessionMode(mode: string) {
  if (mode === "normal") return "顺序练习";
  if (mode === "wrong_only") return "错题练习";
  return mode;
}

export function formatSessionStatus(status: string) {
  if (status === "in_progress") return "进行中";
  if (status === "completed") return "已完成";
  if (status === "abandoned") return "已中断";
  return status;
}

export function formatQuestionType(questionType: string) {
  if (questionType === "single") return "单选题";
  if (questionType === "judge") return "判断题";
  return questionType;
}

export function formatAnswerByOptions(answer: string, options: OptionLike[]) {
  const matched = options.find((item) => item.key === answer);
  return matched ? `${answer}：${matched.text}` : answer;
}

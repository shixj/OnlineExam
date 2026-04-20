export function formatUserStatus(status: string) {
  if (status === "enabled") return "已启用";
  if (status === "disabled") return "已停用";
  return status;
}

export function formatSessionStatus(status: string) {
  if (status === "in_progress") return "进行中";
  if (status === "completed") return "已完成";
  if (status === "abandoned") return "已中断";
  return status;
}

export function formatSessionMode(mode: string) {
  if (mode === "normal") return "顺序练习";
  if (mode === "wrong_only") return "错题练习";
  return mode;
}

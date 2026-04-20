import { Card, Table, Tag } from "antd";
import { formatDate } from "../lib/api";
import { formatSessionMode, formatSessionStatus } from "../lib/labels";
import type { PracticeSession } from "../types";

function statusTag(status: string) {
  const colorMap: Record<string, string> = {
    completed: "success",
    in_progress: "processing",
    abandoned: "default",
  };
  return <Tag color={colorMap[status] ?? "default"}>{formatSessionStatus(status)}</Tag>;
}

export default function SessionsView({ sessions }: { sessions: PracticeSession[] }) {
  return (
    <Card title="做题记录" style={{ marginTop: 16 }}>
      <Table
        rowKey="id"
        dataSource={sessions}
        pagination={{ pageSize: 8 }}
        columns={[
          { title: "用户", render: (_, record: PracticeSession) => `${record.real_name}（${record.username}）` },
          { title: "题库", render: (_, record: PracticeSession) => `${record.bank_name} / ${record.bank_version}` },
          { title: "模式", dataIndex: "mode", render: (value: string) => formatSessionMode(value) },
          { title: "状态", dataIndex: "status", render: (value: string) => statusTag(value) },
          { title: "进度", render: (_, record: PracticeSession) => `已答 ${record.answered_count} / ${record.total_count}` },
          { title: "正确 / 错误", render: (_, record: PracticeSession) => `${record.correct_count} 题正确 / ${record.wrong_count} 题错误` },
          { title: "开始时间", dataIndex: "started_at", render: (value: string | null) => formatDate(value) },
          { title: "提交时间", dataIndex: "submitted_at", render: (value: string | null) => formatDate(value) },
        ]}
      />
    </Card>
  );
}

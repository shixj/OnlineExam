import { Button, Card, List, Space, Tag, Typography } from "antd";
import type { HistoryItem } from "../types";
import { formatDate } from "../lib/api";
import { formatSessionMode, formatSessionStatus } from "../lib/labels";

const { Text } = Typography;

type Props = {
  history: HistoryItem[];
  clearing: boolean;
  onClear: () => void;
};

export default function HistoryScreen({ history, clearing, onClear }: Props) {
  return (
    <Card
      title="我的练习轨迹"
      extra={(
        <Button danger loading={clearing} disabled={!history.length} onClick={onClear}>
          一键清空历史记录
        </Button>
      )}
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Text type="secondary">展示顺序练习与错题练习的历史记录。</Text>
      <List
        dataSource={history}
        locale={{ emptyText: "暂无练习记录" }}
        renderItem={(item) => (
          <List.Item>
            <List.Item.Meta
              title={`${item.bank_name} / ${item.bank_version}`}
              description={`${formatSessionMode(item.mode)} · ${formatSessionStatus(item.status)} · ${item.correct_count} 题正确 / ${item.wrong_count} 题错误`}
            />
            <div className="practice-history-meta">
              <Tag color={item.status === "completed" ? "success" : "processing"}>
                {formatSessionStatus(item.status)}
              </Tag>
              <Tag>{`已答 ${item.answered_count} / ${item.total_count}`}</Tag>
              <Text type="secondary">开始：{formatDate(item.started_at)}</Text>
              <Text type="secondary">提交：{formatDate(item.submitted_at)}</Text>
            </div>
          </List.Item>
        )}
      />
      </Space>
    </Card>
  );
}

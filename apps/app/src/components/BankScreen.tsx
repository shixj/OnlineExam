import { Button, Card, Col, Descriptions, List, Row, Space } from "antd";
import { PlayCircleOutlined, ReloadOutlined, WarningOutlined } from "@ant-design/icons";
import type { BankSummary } from "../types";

export default function BankScreen({
  bankSummary,
  onStartPractice,
  onContinuePractice,
  onOpenWrongQuestions,
}: {
  bankSummary: BankSummary;
  onStartPractice: (mode: "normal" | "wrong_only", category?: string) => void;
  onContinuePractice: () => void;
  onOpenWrongQuestions: () => void;
}) {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} xl={14}>
        <Card title={`${bankSummary.name} / ${bankSummary.version}`}>
          <Descriptions column={{ xs: 1, md: 2 }} bordered size="small">
            <Descriptions.Item label="总题数">{bankSummary.totalCount}</Descriptions.Item>
            <Descriptions.Item label="单选题">{bankSummary.singleCount}</Descriptions.Item>
            <Descriptions.Item label="判断题">{bankSummary.judgeCount}</Descriptions.Item>
            <Descriptions.Item label="待练错题">{bankSummary.unresolvedWrongCount}</Descriptions.Item>
          </Descriptions>
          <Space wrap style={{ marginTop: 16 }}>
            <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => onStartPractice("normal")}>开始顺序练习</Button>
            <Button icon={<ReloadOutlined />} onClick={onContinuePractice}>继续上次练习</Button>
            <Button icon={<WarningOutlined />} onClick={() => onStartPractice("wrong_only")}>错题练习</Button>
            <Button onClick={onOpenWrongQuestions}>查看错题库</Button>
          </Space>
        </Card>
      </Col>
      <Col xs={24} xl={10}>
        <Card title="分类分布">
          <List
            dataSource={bankSummary.categories}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button key="category-practice" type="link" onClick={() => onStartPractice("normal", item.category)}>
                    专项练习
                  </Button>,
                ]}
              >
                <List.Item.Meta title={item.category} description={`题目数：${item.count}`} />
              </List.Item>
            )}
          />
        </Card>
      </Col>
    </Row>
  );
}

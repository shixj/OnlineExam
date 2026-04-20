import { Button, Card, Col, Row, Space, Statistic, Typography } from "antd";
import type { BankItem, HistoryItem } from "../types";

const { Title, Paragraph, Text } = Typography;

type Props = {
  realName: string;
  banks: BankItem[];
  history: HistoryItem[];
  selectedBankId: string;
  onViewBank: (bankId: string) => void;
};

export default function HomeScreen({
  realName,
  banks,
  history,
  selectedBankId,
  onViewBank,
}: Props) {
  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Card className="practice-hero-card">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={16}>
            <Space direction="vertical" size={4}>
              <Text type="secondary">欢迎回来</Text>
              <Title level={3} style={{ margin: 0 }}>{realName}</Title>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                选择一个题库开始顺序练习，或直接进入错题重练。页面已按视图懒加载拆分，兼顾手机与 iPad 布局。
              </Paragraph>
            </Space>
          </Col>
          <Col xs={24} md={8}>
            <Row gutter={[12, 12]}>
              <Col span={12}><Card size="small"><Statistic title="已发布题库" value={banks.length} /></Card></Col>
              <Col span={12}><Card size="small"><Statistic title="进行中练习" value={history.filter((item) => item.status === "in_progress").length} /></Card></Col>
            </Row>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        {banks.map((bank) => (
          <Col xs={24} md={12} xl={8} key={bank.id}>
            <Card
              hoverable
              className={selectedBankId === bank.id ? "practice-bank-card selected" : "practice-bank-card"}
              actions={[
                <Button type="link" key="view" onClick={() => onViewBank(bank.id)}>
                  查看详情
                </Button>,
              ]}
            >
              <Space direction="vertical" size={6}>
                <Title level={5} style={{ margin: 0 }}>{bank.name} / {bank.version}</Title>
                <Text type="secondary">总题数 {bank.totalCount} · 单选 {bank.singleCount} · 判断 {bank.judgeCount}</Text>
                <Text type="secondary">分类数 {bank.categoryCount}</Text>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>
    </Space>
  );
}

import { useEffect, useState } from "react";
import { Button, Card, Col, Divider, Grid, Radio, Row, Space, Tag, Typography } from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";
import type { QuestionPayload, SessionProgress } from "../types";
import { formatQuestionType } from "../lib/labels";

const { Title, Paragraph, Text } = Typography;

function trackerButtonStyle(status: "pending" | "correct" | "wrong", isCurrent: boolean) {
  if (status === "correct") {
    return {
      backgroundColor: "#dcfce7",
      borderColor: "#16a34a",
      color: "#166534",
      fontWeight: 600,
    };
  }

  if (status === "wrong") {
    return {
      backgroundColor: "#fee2e2",
      borderColor: "#dc2626",
      color: "#991b1b",
      fontWeight: 600,
    };
  }

  if (isCurrent) {
    return {
      borderColor: "#2563eb",
      color: "#1d4ed8",
      fontWeight: 600,
    };
  }

  return undefined;
}

export default function PracticeScreen({
  currentQuestion,
  selectedAnswer,
  progress,
  onAnswerChange,
  onSubmit,
  onReviewQuestion,
  onFocusCurrentQuestion,
}: {
  currentQuestion: QuestionPayload;
  selectedAnswer: string;
  progress: SessionProgress | null;
  onAnswerChange: (value: string) => void;
  onSubmit: () => void;
  onReviewQuestion: (questionId: string) => void;
  onFocusCurrentQuestion: () => void;
}) {
  const screens = Grid.useBreakpoint();
  const isCompactScreen = !screens.lg;
  const [progressCollapsed, setProgressCollapsed] = useState(isCompactScreen);

  useEffect(() => {
    setProgressCollapsed(isCompactScreen);
  }, [isCompactScreen]);

  return (
    <div className="practice-session-layout">
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card>
            <Space direction="vertical" size={8}>
              <Space wrap>
                <Tag color="processing">{currentQuestion.category}</Tag>
                <Tag>{formatQuestionType(currentQuestion.questionType)}</Tag>
                {currentQuestion.sourceNo ? <Tag>{`题号 ${currentQuestion.sourceNo}`}</Tag> : null}
              </Space>
              <Title level={4} style={{ margin: 0 }}>第 {currentQuestion.index} / {currentQuestion.total} 题</Title>
              <Paragraph className="practice-question-stem">{currentQuestion.stem}</Paragraph>
            </Space>
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card title="选择答案">
            <Radio.Group
              value={selectedAnswer}
              onChange={(event) => onAnswerChange(event.target.value)}
              className="practice-answer-group"
            >
              <Space direction="vertical" style={{ width: "100%" }}>
                {currentQuestion.options.map((option) => (
                  <Radio.Button className="practice-answer-option" key={option.key} value={option.key}>
                    <div className="practice-answer-content">
                      <Tag color={selectedAnswer === option.key ? "blue" : "default"}>{option.key}</Tag>
                      <span>{option.text}</span>
                    </div>
                  </Radio.Button>
                ))}
              </Space>
            </Radio.Group>
          </Card>

          <Card
            title="题号进度"
            style={{ marginTop: 16 }}
            extra={
              isCompactScreen ? (
                <Button type="link" size="small" onClick={() => setProgressCollapsed((value) => !value)}>
                  {progressCollapsed ? "展开" : "收起"}
                </Button>
              ) : null
            }
          >
            {progressCollapsed ? (
              <Text type="secondary">
                已做 {progress?.answeredCount ?? 0} / {progress?.totalCount ?? currentQuestion.total}，点击展开查看答题卡。
              </Text>
            ) : (
              <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                <Space wrap>
                  <Tag color="blue">当前题</Tag>
                  <Tag color="green">答对</Tag>
                  <Tag color="red">答错</Tag>
                  <Tag>未做</Tag>
                </Space>
                <Text type="secondary">
                  已做 {progress?.answeredCount ?? 0} / {progress?.totalCount ?? currentQuestion.total}。点击已做过的题号可查看你的答案和正确答案。
                </Text>
                <Divider style={{ margin: "8px 0" }} />
                <Space wrap size={[8, 8]}>
                  {(progress?.items ?? []).map((item) => {
                    const isAnswered = item.status !== "pending";
                    const isCurrent = item.questionId === currentQuestion.questionId;
                    return (
                      <Button
                        key={item.questionId}
                        size="small"
                        type={isCurrent && item.status === "pending" ? "primary" : "default"}
                        style={trackerButtonStyle(item.status, isCurrent)}
                        onClick={
                          isCurrent
                            ? onFocusCurrentQuestion
                            : isAnswered
                              ? () => onReviewQuestion(item.questionId)
                              : undefined
                        }
                      >
                        {item.label}
                      </Button>
                    );
                  })}
                </Space>
              </Space>
            )}
          </Card>
        </Col>
      </Row>

      <div className="practice-submit-bar">
        <Button type="primary" size="large" block icon={<CheckCircleOutlined />} onClick={onSubmit} disabled={!selectedAnswer}>
          提交答案
        </Button>
      </div>
    </div>
  );
}

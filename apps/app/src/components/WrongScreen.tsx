import { Button, Card, Empty, List } from "antd";
import type { WrongItem } from "../types";
import { formatAnswerByOptions, formatQuestionType } from "../lib/labels";

export default function WrongScreen({
  selectedBankName,
  wrongQuestions,
  onStartWrongPractice,
}: {
  selectedBankName: string;
  wrongQuestions: WrongItem[];
  onStartWrongPractice: () => void;
}) {
  return (
    <Card title={`${selectedBankName} 的未掌握错题`} extra={<Button onClick={onStartWrongPractice}>进入错题练习</Button>}>
      {wrongQuestions.length === 0 ? (
        <Empty description="当前没有待练习错题" />
      ) : (
        <List
          dataSource={wrongQuestions}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                title={item.question.stem}
                description={`${item.question.category} · ${formatQuestionType(item.question.questionType)} · 错误次数 ${item.wrongCount} · 正确答案 ${formatAnswerByOptions(item.correctAnswer, item.question.options)}`}
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );
}

import { Button, Card, Result } from "antd";
import type { SessionResult } from "../types";

export default function ResultScreen({
  result,
  onBackHome,
  onViewHistory,
}: {
  result: SessionResult;
  onBackHome: () => void;
  onViewHistory: () => void;
}) {
  return (
    <Card>
      <Result
        status="success"
        title="本次练习已完成"
        subTitle={`共 ${result.total_count} 题，答对 ${result.correct_count} 题，答错 ${result.wrong_count} 题。`}
        extra={[
          <Button type="primary" key="home" onClick={onBackHome}>返回首页</Button>,
          <Button key="history" onClick={onViewHistory}>查看历史记录</Button>,
        ]}
      />
    </Card>
  );
}

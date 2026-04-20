import { App as AntApp, Button, Card, Form, Input, Space, Typography } from "antd";
import type { AuthState } from "../types";
import { request } from "../lib/api";

const { Title, Paragraph, Text } = Typography;

export default function LoginScreen({ onLogin }: { onLogin: (auth: AuthState) => void }) {
  const { message } = AntApp.useApp();

  async function handleFinish(values: { username: string; password: string }) {
    try {
      const auth = await request<AuthState>("/api/app/login", {
        method: "POST",
        body: JSON.stringify(values),
      });
      onLogin(auth);
      message.success("登录成功");
    } catch (error) {
      message.error((error as Error).message);
    }
  }

  return (
    <div className="practice-login-shell">
      <Card className="practice-login-card" variant="borderless">
        <Space direction="vertical" size={4}>
          <Text type="secondary">在线考试练习</Text>
          <Title level={2} style={{ margin: 0 }}>登录开始练习</Title>
          <Paragraph type="secondary">请输入账号密码开始练习。</Paragraph>
        </Space>
        <Form layout="vertical" onFinish={(values) => void handleFinish(values)}>
          <Form.Item label="用户名" name="username" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="密码" name="password" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>登录</Button>
        </Form>
      </Card>
    </div>
  );
}

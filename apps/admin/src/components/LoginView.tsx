import { App as AntApp, Button, Card, Form, Input, Space, Typography } from "antd";
import { request } from "../lib/api";
import type { AuthState } from "../types";

const { Title, Paragraph, Text } = Typography;

export default function LoginView({ onLogin }: { onLogin: (auth: AuthState) => void }) {
  const { message } = AntApp.useApp();

  async function handleFinish(values: { username: string; password: string }) {
    try {
      const result = await request<AuthState>(
        "/api/admin/login",
        {
          method: "POST",
          body: JSON.stringify(values),
        },
      );
      onLogin(result);
      message.success("登录成功");
    } catch (error) {
      message.error((error as Error).message);
    }
  }

  return (
    <div className="admin-login-shell">
      <Card className="admin-login-card" variant="borderless">
        <Space direction="vertical" size={4}>
          <Text type="secondary">在线考试后台</Text>
          <Title level={2} style={{ margin: 0 }}>管理员登录</Title>
          <Paragraph type="secondary" style={{ marginBottom: 12 }}>
            使用管理员账号进入题库、用户和做题记录管理台。
          </Paragraph>
        </Space>
        <Form
          layout="vertical"
          onFinish={(values) => void handleFinish(values)}
        >
          <Form.Item label="用户名" name="username" rules={[{ required: true, message: "请输入用户名" }]}>
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item label="密码" name="password" rules={[{ required: true, message: "请输入密码" }]}>
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            登录
          </Button>
        </Form>
      </Card>
    </div>
  );
}

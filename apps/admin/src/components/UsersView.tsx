import { useState } from "react";
import { Button, Card, Col, Form, Input, Modal, Popconfirm, Row, Space, Table, Tag, Typography } from "antd";
import { KeyOutlined, UserAddOutlined } from "@ant-design/icons";
import { formatDate, request } from "../lib/api";
import { formatUserStatus } from "../lib/labels";
import type { AdminUser, AuthState } from "../types";

type NotifyKind = "success" | "warning" | "error";

function statusTag(status: string) {
  return <Tag color={status === "enabled" ? "success" : "default"}>{formatUserStatus(status)}</Tag>;
}

export default function UsersView({
  auth,
  token,
  users,
  onReload,
  onNotify,
  onForceLogout,
}: {
  auth: AuthState;
  token: string;
  users: AdminUser[];
  onReload: () => Promise<void>;
  onNotify: (kind: NotifyKind, text: string) => void;
  onForceLogout: () => void;
}) {
  const [createForm] = Form.useForm<{ username: string; realName: string; phone: string; password: string }>();
  const [adminPasswordForm] = Form.useForm<{ currentPassword: string; newPassword: string; confirmPassword: string }>();
  const [resetPasswordForm] = Form.useForm<{ newPassword: string; confirmPassword: string }>();
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [submittingAdminPassword, setSubmittingAdminPassword] = useState(false);
  const [statusLoadingUserId, setStatusLoadingUserId] = useState("");
  const [resettingUserId, setResettingUserId] = useState("");
  const [deletingUserId, setDeletingUserId] = useState("");
  const [resetModalUser, setResetModalUser] = useState<AdminUser | null>(null);
  const [keyword, setKeyword] = useState("");

  const filteredUsers = users.filter((user) => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) return true;
    return (
      user.username.toLowerCase().includes(normalizedKeyword)
      || user.realName.toLowerCase().includes(normalizedKeyword)
      || user.phone.toLowerCase().includes(normalizedKeyword)
    );
  });

  async function createUser(values: { username: string; realName: string; phone: string; password: string }) {
    setSubmittingCreate(true);
    try {
      await request("/api/admin/users", { method: "POST", body: JSON.stringify(values) }, token);
      createForm.resetFields();
      onNotify("success", "用户已创建");
      await onReload();
    } catch (error) {
      onNotify("error", (error as Error).message);
    } finally {
      setSubmittingCreate(false);
    }
  }

  async function updateUserStatus(userId: string, status: "enabled" | "disabled") {
    setStatusLoadingUserId(userId);
    try {
      await request(`/api/admin/users/${userId}/status`, { method: "POST", body: JSON.stringify({ status }) }, token);
      onNotify("success", status === "enabled" ? "用户已启用" : "用户已停用");
      await onReload();
    } catch (error) {
      onNotify("error", (error as Error).message);
    } finally {
      setStatusLoadingUserId("");
    }
  }

  async function updateAdminPassword(values: { currentPassword: string; newPassword: string }) {
    setSubmittingAdminPassword(true);
    try {
      await request("/api/admin/me/password", { method: "POST", body: JSON.stringify(values) }, token);
      adminPasswordForm.resetFields();
      onNotify("success", "管理员密码已更新，请重新登录");
      onForceLogout();
    } catch (error) {
      onNotify("error", (error as Error).message);
    } finally {
      setSubmittingAdminPassword(false);
    }
  }

  async function resetUserPassword(values: { newPassword: string }) {
    if (!resetModalUser) return;
    setResettingUserId(resetModalUser.id);
    try {
      await request(`/api/admin/users/${resetModalUser.id}/password`, { method: "POST", body: JSON.stringify(values) }, token);
      resetPasswordForm.resetFields();
      setResetModalUser(null);
      onNotify("success", `已重置 ${resetModalUser.username} 的密码`);
    } catch (error) {
      onNotify("error", (error as Error).message);
    } finally {
      setResettingUserId("");
    }
  }

  async function deleteUser(user: AdminUser) {
    setDeletingUserId(user.id);
    try {
      await request(`/api/admin/users/${user.id}`, { method: "DELETE" }, token);
      onNotify("success", `已删除用户 ${user.username}`);
      await onReload();
    } catch (error) {
      onNotify("error", (error as Error).message);
    } finally {
      setDeletingUserId("");
    }
  }

  return (
    <Space direction="vertical" size="large" style={{ width: "100%", marginTop: 16 }}>
      <Card title="管理员安全设置" extra={<KeyOutlined />}>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
          当前管理员：{auth.user.realName}（{auth.user.username}）
        </Typography.Paragraph>
        <Form form={adminPasswordForm} layout="vertical" onFinish={(values) => void updateAdminPassword(values)}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Form.Item label="当前密码" name="currentPassword" rules={[{ required: true, message: "请输入当前密码" }]}>
                <Input.Password />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="新密码" name="newPassword" rules={[{ required: true, message: "请输入新密码" }, { min: 6, message: "新密码至少 6 位" }]}>
                <Input.Password />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="确认新密码"
                name="confirmPassword"
                dependencies={["newPassword"]}
                rules={[
                  { required: true, message: "请再次输入新密码" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || value === getFieldValue("newPassword")) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error("两次输入的新密码不一致"));
                    },
                  }),
                ]}
              >
                <Input.Password />
              </Form.Item>
            </Col>
          </Row>
          <Button type="primary" htmlType="submit" loading={submittingAdminPassword}>更新管理员密码</Button>
        </Form>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={8}>
          <Card title="新增练习用户" extra={<UserAddOutlined />}>
            <Form form={createForm} layout="vertical" onFinish={(values) => void createUser(values)}>
              <Form.Item label="用户名" name="username" rules={[{ required: true, message: "请输入用户名" }]}><Input /></Form.Item>
              <Form.Item label="姓名" name="realName" rules={[{ required: true, message: "请输入姓名" }]}><Input /></Form.Item>
              <Form.Item label="手机号" name="phone" rules={[{ required: true, message: "请输入手机号" }]}><Input /></Form.Item>
              <Form.Item label="初始密码" name="password" rules={[{ required: true, message: "请输入初始密码" }, { min: 6, message: "密码至少 6 位" }]}><Input.Password /></Form.Item>
              <Button type="primary" htmlType="submit" loading={submittingCreate}>创建用户</Button>
            </Form>
          </Card>
        </Col>
        <Col xs={24} xl={16}>
          <Card
            title="用户列表"
            extra={
              <Input
                allowClear
                placeholder="按用户名/姓名/手机号搜索"
                style={{ width: 260 }}
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />
            }
          >
            <Table
              rowKey="id"
              dataSource={filteredUsers}
              pagination={{ pageSize: 6, showSizeChanger: true, pageSizeOptions: [6, 10, 20, 50] }}
              columns={[
                { title: "用户名", dataIndex: "username" },
                { title: "姓名", dataIndex: "realName" },
                { title: "手机号", dataIndex: "phone" },
                { title: "状态", dataIndex: "status", render: (value: string) => statusTag(value) },
                { title: "最近登录", dataIndex: "lastLoginAt", render: (value: string | null) => formatDate(value) },
                {
                  title: "操作",
                  render: (_, record: AdminUser) => (
                    <Space wrap>
                      <Button
                        size="small"
                        loading={statusLoadingUserId === record.id}
                        onClick={() => void updateUserStatus(record.id, record.status === "enabled" ? "disabled" : "enabled")}
                      >
                        {record.status === "enabled" ? "停用" : "启用"}
                      </Button>
                      <Button
                        size="small"
                        onClick={() => {
                          resetPasswordForm.resetFields();
                          setResetModalUser(record);
                        }}
                      >
                        重置密码
                      </Button>
                      <Popconfirm
                        title="删除用户"
                        description={`确认删除用户 ${record.username} 吗？该用户的做题记录、错题记录将一并删除，且无法恢复。`}
                        okText="删除"
                        cancelText="取消"
                        onConfirm={() => void deleteUser(record)}
                      >
                        <Button size="small" danger loading={deletingUserId === record.id}>删除</Button>
                      </Popconfirm>
                    </Space>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        open={resetModalUser !== null}
        title={resetModalUser ? `重置用户密码：${resetModalUser.username}` : "重置用户密码"}
        onCancel={() => {
          resetPasswordForm.resetFields();
          setResetModalUser(null);
        }}
        footer={null}
        destroyOnHidden
      >
        <Form form={resetPasswordForm} layout="vertical" onFinish={(values) => void resetUserPassword(values)}>
          <Form.Item label="新密码" name="newPassword" rules={[{ required: true, message: "请输入新密码" }, { min: 6, message: "密码至少 6 位" }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item
            label="确认新密码"
            name="confirmPassword"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "请再次输入新密码" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || value === getFieldValue("newPassword")) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("两次输入的新密码不一致"));
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>
          <Space>
            <Button onClick={() => setResetModalUser(null)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={resettingUserId === resetModalUser?.id}>确认重置</Button>
          </Space>
        </Form>
      </Modal>
    </Space>
  );
}

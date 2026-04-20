import { Suspense, lazy, useEffect, useEffectEvent, useMemo, useState } from "react";
import { App as AntApp, Button, Card, Col, Layout, Menu, Row, Spin, Statistic, Typography } from "antd";
import { LogoutOutlined, ProfileOutlined, ReadOutlined, TeamOutlined } from "@ant-design/icons";
import { request } from "../lib/api";
import type { AdminUser, AuthState, BankDetail, ImportJob, PracticeSession, QuestionBank } from "../types";

const { Content, Header, Sider } = Layout;
const { Title, Text } = Typography;

const BanksView = lazy(() => import("./BanksView"));
const UsersView = lazy(() => import("./UsersView"));
const SessionsView = lazy(() => import("./SessionsView"));

type NotifyKind = "success" | "warning" | "error";

type Props = {
  auth: AuthState;
  onLogout: () => void;
};

export default function AdminShell({ auth, onLogout }: Props) {
  const { message } = AntApp.useApp();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [activeTab, setActiveTab] = useState<"banks" | "users" | "sessions">("banks");
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [bankDetail, setBankDetail] = useState<BankDetail | null>(null);
  const [importJob, setImportJob] = useState<ImportJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const token = auth.token;

  async function loadAll() {
    setLoading(true);
    try {
      const [usersData, banksData, sessionsData] = await Promise.all([
        request<AdminUser[]>("/api/admin/users", undefined, token),
        request<QuestionBank[]>("/api/admin/question-banks", undefined, token),
        request<PracticeSession[]>("/api/admin/practice-sessions", undefined, token),
      ]);
      setUsers(usersData);
      setBanks(banksData);
      setSessions(sessionsData);
    } catch (error) {
      message.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const refreshDashboard = useEffectEvent(async () => {
    await loadAll();
  });

  useEffect(() => {
    void refreshDashboard();
  }, [token]);

  const loadBankDetail = useEffectEvent(async (bankId: string) => {
    setDetailLoading(true);
    try {
      const detail = await request<BankDetail>(`/api/admin/question-banks/${bankId}`, undefined, token);
      setBankDetail(detail);
    } catch (error) {
      message.error((error as Error).message);
    } finally {
      setDetailLoading(false);
    }
  });

  useEffect(() => {
    if (!selectedBankId) return;
    void loadBankDetail(selectedBankId);
  }, [selectedBankId, token]);

  const stats = useMemo(() => ({
    totalBanks: banks.length,
    publishedBanks: banks.filter((item) => item.status === "published").length,
    totalUsers: users.length,
    sessionCount: sessions.length,
  }), [banks, users, sessions]);

  function notify(kind: NotifyKind, text: string) {
    if (kind === "success") message.success(text);
    if (kind === "warning") message.warning(text);
    if (kind === "error") message.error(text);
  }

  return (
    <Layout className="admin-layout-shell">
      <Sider breakpoint="lg" collapsedWidth="0" width={240} className="admin-sider">
        <div className="admin-brand">
          <Text className="admin-brand-eyebrow">在线考试后台</Text>
          <Title level={4} style={{ color: "#fff", margin: "4px 0" }}>运营控制台</Title>
          <Text style={{ color: "rgba(255,255,255,0.72)" }}>当前登录：{auth.user.realName}</Text>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[activeTab]}
          onClick={(event) => setActiveTab(event.key as "banks" | "users" | "sessions")}
          items={[
            { key: "banks", icon: <ReadOutlined />, label: "题库管理" },
            { key: "users", icon: <TeamOutlined />, label: "用户管理" },
            { key: "sessions", icon: <ProfileOutlined />, label: "做题记录" },
          ]}
        />
        <Button danger icon={<LogoutOutlined />} className="admin-logout" onClick={onLogout}>
          退出登录
        </Button>
      </Sider>
      <Layout>
        <Header className="admin-header">
          <Title level={3} style={{ margin: 0 }}>在线考试管理后台</Title>
          <Text type="secondary">支持题库、用户与做题记录的统一管理</Text>
        </Header>
        <Content className="admin-content">
          <Spin spinning={loading}>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12} xl={6}><Card><Statistic title="题库版本" value={stats.totalBanks} /></Card></Col>
              <Col xs={24} md={12} xl={6}><Card><Statistic title="已发布版本" value={stats.publishedBanks} /></Card></Col>
              <Col xs={24} md={12} xl={6}><Card><Statistic title="活跃用户池" value={stats.totalUsers} /></Card></Col>
              <Col xs={24} md={12} xl={6}><Card><Statistic title="做题会话数" value={stats.sessionCount} /></Card></Col>
            </Row>

            <Suspense fallback={<div style={{ padding: 32, textAlign: "center" }}>页面加载中...</div>}>
              {activeTab === "banks" ? (
                <BanksView
                  token={token}
                  banks={banks}
                  importJob={importJob}
                  setImportJob={setImportJob}
                  setSelectedBankId={setSelectedBankId}
                  setBankDetail={setBankDetail}
                  bankDetail={bankDetail}
                  detailLoading={detailLoading}
                  onReload={loadAll}
                  onNotify={notify}
                />
              ) : null}
              {activeTab === "users" ? (
                <UsersView
                  auth={auth}
                  token={token}
                  users={users}
                  onReload={loadAll}
                  onNotify={notify}
                  onForceLogout={onLogout}
                />
              ) : null}
              {activeTab === "sessions" ? <SessionsView sessions={sessions} /> : null}
            </Suspense>
          </Spin>
        </Content>
      </Layout>
    </Layout>
  );
}

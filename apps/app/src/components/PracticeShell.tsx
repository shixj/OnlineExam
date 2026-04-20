import { Suspense, lazy, useEffect, useEffectEvent, useMemo, useState } from "react";
import { App as AntApp, Button, Descriptions, Layout, Modal, Space, Tag, Typography } from "antd";
import { BookOutlined, HistoryOutlined, LogoutOutlined } from "@ant-design/icons";
import type {
  AuthState,
  BankItem,
  BankSummary,
  HistoryItem,
  QuestionPayload,
  SessionProgress,
  SessionQuestionReview,
  SessionResult,
  WrongItem,
} from "../types";
import { request } from "../lib/api";
import { formatAnswerByOptions, formatQuestionType } from "../lib/labels";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const HomeScreen = lazy(() => import("./HomeScreen"));
const BankScreen = lazy(() => import("./BankScreen"));
const PracticeScreen = lazy(() => import("./PracticeScreen"));
const ResultScreen = lazy(() => import("./ResultScreen"));
const WrongScreen = lazy(() => import("./WrongScreen"));
const HistoryScreen = lazy(() => import("./HistoryScreen"));

type Screen = "home" | "bank" | "practice" | "history" | "wrong" | "result";

type Props = {
  auth: AuthState;
  onLogout: () => void;
};

export default function PracticeShell({ auth, onLogout }: Props) {
  const { message } = AntApp.useApp();
  const [screen, setScreen] = useState<Screen>("home");
  const [banks, setBanks] = useState<BankItem[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [bankSummary, setBankSummary] = useState<BankSummary | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionPayload | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [progress, setProgress] = useState<SessionProgress | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [wrongQuestions, setWrongQuestions] = useState<WrongItem[]>([]);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [reviewQuestion, setReviewQuestion] = useState<SessionQuestionReview | null>(null);
  const [clearingHistory, setClearingHistory] = useState(false);
  const token = auth.token;

  async function loadBanks() {
    const data = await request<BankItem[]>("/api/app/question-banks", undefined, token);
    setBanks(data);
    if (!selectedBankId && data[0]) {
      setSelectedBankId(data[0].id);
    }
  }

  async function loadBankSummary(bankId: string) {
    const summary = await request<BankSummary>(`/api/app/question-banks/${bankId}/summary`, undefined, token);
    setBankSummary(summary);
    setSelectedBankId(bankId);
  }

  async function loadHistory() {
    const data = await request<HistoryItem[]>("/api/app/practice-sessions/history", undefined, token);
    setHistory(data);
  }

  async function loadWrongQuestions(bankId: string) {
    const data = await request<WrongItem[]>(`/api/app/wrong-questions?bankId=${bankId}`, undefined, token);
    setWrongQuestions(data);
  }

  const loadInitialData = useEffectEvent(async () => {
    try {
      await Promise.all([loadBanks(), loadHistory()]);
    } catch (error) {
      message.error((error as Error).message);
    }
  });

  useEffect(() => {
    void loadInitialData();
  }, [token]);

  const syncBankSummary = useEffectEvent(async (bankId: string) => {
    try {
      await loadBankSummary(bankId);
    } catch (error) {
      message.error((error as Error).message);
    }
  });

  useEffect(() => {
    if (!selectedBankId) return;
    void syncBankSummary(selectedBankId);
  }, [selectedBankId, token]);

  const selectedBank = useMemo(
    () => banks.find((item) => item.id === selectedBankId) ?? null,
    [banks, selectedBankId],
  );

  const accessibleProgressItems = useMemo(
    () => (progress?.items ?? []).filter((item) => item.status !== "pending" || item.questionId === currentQuestion?.questionId),
    [progress, currentQuestion],
  );

  function applyActiveSession(params: {
    sessionId: string;
    question: QuestionPayload | null;
    progress: SessionProgress | null;
  }) {
    setCurrentSessionId(params.sessionId);
    setCurrentQuestion(params.question);
    setProgress(params.progress);
    setSelectedAnswer("");
    setResult(null);
    setScreen("practice");
  }

  async function startPractice(mode: "normal" | "wrong_only", category?: string) {
    try {
      const path = mode === "wrong_only" ? "/api/app/wrong-practice-sessions" : "/api/app/practice-sessions";
      const payload = mode === "wrong_only" ? { bankId: selectedBankId } : { bankId: selectedBankId, mode, category };
      const response = await request<{
        sessionId: string;
        categoryFilter?: string | null;
        question: QuestionPayload | null;
        progress: SessionProgress | null;
      }>(path, {
        method: "POST",
        body: JSON.stringify(payload),
      }, token);
      applyActiveSession({
        sessionId: response.sessionId,
        question: response.question,
        progress: response.progress,
      });
    } catch (error) {
      message.error((error as Error).message);
    }
  }

  async function continuePractice(mode: "normal" | "wrong_only", category?: string | null) {
    const latest = await request<{ session: { id: string } | null }>(
      `/api/app/practice-sessions/latest?bankId=${selectedBankId}&mode=${mode}${category ? `&category=${encodeURIComponent(category)}` : ""}`,
      undefined,
      token,
    );
    if (!latest.session) {
      await startPractice(mode, category ?? undefined);
      return;
    }
    const current = await request<{ question: QuestionPayload | null; progress: SessionProgress | null }>(
      `/api/app/practice-sessions/${latest.session.id}/current`,
      undefined,
      token,
    );
    applyActiveSession({
      sessionId: latest.session.id,
      question: current.question,
      progress: current.progress,
    });
  }

  async function submitCurrentAnswer() {
    if (!currentSessionId || !currentQuestion || !selectedAnswer) return;
    const response = await request<{
      isCorrect: boolean;
      correctAnswer: string;
      completed: boolean;
      nextQuestion: QuestionPayload | null;
      progress: SessionProgress | null;
    }>(`/api/app/practice-sessions/${currentSessionId}/answer`, {
      method: "POST",
      body: JSON.stringify({
        questionId: currentQuestion.questionId,
        userAnswer: selectedAnswer,
        durationSeconds: 5,
      }),
    }, token);

    if (response.isCorrect) {
      message.success("回答正确");
    } else {
      message.warning(`回答错误，正确答案：${formatAnswerByOptions(response.correctAnswer, currentQuestion.options)}`);
    }

    setProgress(response.progress);

    if (response.completed) {
      const session = await request<SessionResult>(`/api/app/practice-sessions/${currentSessionId}/submit`, { method: "POST" }, token);
      setResult(session);
      setCurrentQuestion(null);
      setScreen("result");
      await loadHistory();
      await loadBanks();
      return;
    }

    setCurrentQuestion(response.nextQuestion);
    setSelectedAnswer("");
    await loadBanks();
  }

  async function openWrongQuestions() {
    if (!selectedBankId) return;
    await loadWrongQuestions(selectedBankId);
    setScreen("wrong");
  }

  async function clearHistory() {
    const confirmed = await new Promise<boolean>((resolve) => {
      Modal.confirm({
        title: "确认清空历史记录",
        content: "清空后将删除当前账号的练习历史、答题记录和错题库，且无法恢复。是否继续？",
        okText: "确认清空",
        cancelText: "取消",
        okButtonProps: { danger: true },
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });

    if (!confirmed) return;

    setClearingHistory(true);
    try {
      await request("/api/app/practice-sessions/history/clear", {
        method: "POST",
        body: JSON.stringify({}),
      }, token);
      await Promise.all([
        loadHistory(),
        loadBanks(),
        selectedBankId ? loadBankSummary(selectedBankId) : Promise.resolve(),
      ]);
      setWrongQuestions([]);
      message.success("已清空历史记录");
    } catch (error) {
      message.error((error as Error).message);
    } finally {
      setClearingHistory(false);
    }
  }

  async function openAnsweredQuestion(questionId: string) {
    if (!currentSessionId) return;
    try {
      const detail = await request<SessionQuestionReview>(
        `/api/app/practice-sessions/${currentSessionId}/questions/${questionId}`,
        undefined,
        token,
      );
      setReviewQuestion(detail);
    } catch (error) {
      message.error((error as Error).message);
    }
  }

  function focusCurrentQuestion() {
    setReviewQuestion(null);
  }

  function navigateReview(offset: -1 | 1) {
    if (!reviewQuestion || !currentQuestion) return;
    const currentIndex = accessibleProgressItems.findIndex((item) => item.questionId === reviewQuestion.questionId);
    if (currentIndex === -1) return;
    const target = accessibleProgressItems[currentIndex + offset];
    if (!target) return;

    if (target.questionId === currentQuestion.questionId) {
      setReviewQuestion(null);
      return;
    }

    void openAnsweredQuestion(target.questionId);
  }

  return (
    <Layout className="practice-layout-shell">
      <Header className="practice-header">
        <div>
          <Text className="practice-header-eyebrow">在线考试练习</Text>
          <Title level={3} style={{ margin: "4px 0 0" }}>
            {screen === "practice" ? "答题中" : screen === "result" ? "练习结果" : "练习中心"}
          </Title>
        </div>
        <Space wrap>
          <Button icon={<BookOutlined />} onClick={() => setScreen("home")}>首页</Button>
          <Button icon={<HistoryOutlined />} onClick={() => { setScreen("history"); void loadHistory(); }}>历史</Button>
          <Button icon={<LogoutOutlined />} danger onClick={onLogout}>
            退出
          </Button>
        </Space>
      </Header>
      <Content className="practice-content">
        <Suspense fallback={<div style={{ padding: 32, textAlign: "center" }}>页面加载中...</div>}>
          {screen === "home" ? (
            <HomeScreen
              realName={auth.user.realName}
              banks={banks}
              history={history}
              selectedBankId={selectedBankId}
              onViewBank={(bankId) => {
                setSelectedBankId(bankId);
                setScreen("bank");
              }}
            />
          ) : null}
          {screen === "bank" && bankSummary ? (
            <BankScreen
              bankSummary={bankSummary}
              onStartPractice={(mode, category) => void startPractice(mode, category)}
              onContinuePractice={() => void continuePractice("normal")}
              onOpenWrongQuestions={() => void openWrongQuestions()}
            />
          ) : null}
          {screen === "practice" && currentQuestion ? (
            <PracticeScreen
              currentQuestion={currentQuestion}
              selectedAnswer={selectedAnswer}
              progress={progress}
              onAnswerChange={setSelectedAnswer}
              onSubmit={() => void submitCurrentAnswer()}
              onReviewQuestion={(questionId) => void openAnsweredQuestion(questionId)}
              onFocusCurrentQuestion={focusCurrentQuestion}
            />
          ) : null}
          {screen === "result" && result ? (
            <ResultScreen result={result} onBackHome={() => setScreen("home")} onViewHistory={() => setScreen("history")} />
          ) : null}
          {screen === "wrong" ? (
            <WrongScreen
              selectedBankName={selectedBank?.name ?? "当前题库"}
              wrongQuestions={wrongQuestions}
              onStartWrongPractice={() => void startPractice("wrong_only")}
            />
          ) : null}
          {screen === "history" ? (
            <HistoryScreen
              history={history}
              clearing={clearingHistory}
              onClear={() => void clearHistory()}
            />
          ) : null}
        </Suspense>
      </Content>

      <Modal
        open={reviewQuestion !== null}
        title={reviewQuestion ? `已答题回看${reviewQuestion.sourceNo ? ` · 题号 ${reviewQuestion.sourceNo}` : ""}` : "已答题回看"}
        footer={
          reviewQuestion
            ? [
                <Button
                  key="prev"
                  onClick={() => navigateReview(-1)}
                  disabled={accessibleProgressItems.findIndex((item) => item.questionId === reviewQuestion.questionId) <= 0}
                >
                  上一题
                </Button>,
                <Button key="current" onClick={focusCurrentQuestion}>
                  返回当前题
                </Button>,
                <Button
                  key="next"
                  type="primary"
                  onClick={() => navigateReview(1)}
                  disabled={
                    accessibleProgressItems.findIndex((item) => item.questionId === reviewQuestion.questionId)
                    >= accessibleProgressItems.length - 1
                  }
                >
                  下一题
                </Button>,
              ]
            : null
        }
        onCancel={() => setReviewQuestion(null)}
      >
        {reviewQuestion ? (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Space wrap>
              <Tag color="processing">{reviewQuestion.question.category}</Tag>
              <Tag>{formatQuestionType(reviewQuestion.question.questionType)}</Tag>
            </Space>
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              {reviewQuestion.question.stem}
            </Typography.Paragraph>
            <Space direction="vertical" size={8} style={{ width: "100%" }}>
              {reviewQuestion.question.options.map((option) => (
                <div key={option.key}>{`${option.key}. ${option.text}`}</div>
              ))}
            </Space>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="你的答案">
                <Typography.Text
                  style={
                    reviewQuestion.userAnswer
                      ? reviewQuestion.isCorrect
                        ? { color: "#16a34a", fontWeight: 600 }
                        : { color: "#dc2626", fontWeight: 600 }
                      : undefined
                  }
                >
                  {reviewQuestion.userAnswer
                    ? formatAnswerByOptions(reviewQuestion.userAnswer, reviewQuestion.question.options)
                    : "未作答"}
                </Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item label="正确答案">
                <Typography.Text style={{ color: "#16a34a", fontWeight: 600 }}>
                  {formatAnswerByOptions(reviewQuestion.correctAnswer, reviewQuestion.question.options)}
                </Typography.Text>
              </Descriptions.Item>
            </Descriptions>
          </Space>
        ) : null}
      </Modal>
    </Layout>
  );
}

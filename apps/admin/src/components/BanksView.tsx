import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
  Upload,
} from "antd";
import { CloudUploadOutlined, DeleteOutlined, EditOutlined, FileExcelOutlined, PlusOutlined } from "@ant-design/icons";
import { API_BASE, request } from "../lib/api";
import type { BankDetail, ImportJob, QuestionBank } from "../types";

const { Text, Paragraph } = Typography;

type NotifyKind = "success" | "warning" | "error";

type QuestionFormValues = {
  category: string;
  questionType: "single" | "judge";
  sourceNo?: string;
  stem: string;
  optionA: string;
  optionB: string;
  optionC?: string;
  optionD?: string;
  correctAnswer: "A" | "B" | "C" | "D";
};

type Props = {
  token: string;
  banks: QuestionBank[];
  importJob: ImportJob | null;
  setImportJob: (job: ImportJob | null) => void;
  setSelectedBankId: (id: string) => void;
  setBankDetail: (detail: BankDetail | null) => void;
  bankDetail: BankDetail | null;
  detailLoading: boolean;
  onReload: () => Promise<void>;
  onNotify: (kind: NotifyKind, text: string) => void;
};

function statusTag(status: string) {
  const colorMap: Record<string, string> = {
    published: "success",
    imported: "processing",
    disabled: "default",
  };
  const labelMap: Record<string, string> = {
    published: "已发布",
    imported: "待发布",
    disabled: "已停用",
    draft: "草稿",
  };
  return <Tag color={colorMap[status] ?? "default"}>{labelMap[status] ?? status}</Tag>;
}

function questionTypeLabel(value: string) {
  if (value === "single") return "单选题";
  if (value === "judge") return "判断题";
  return value;
}

function answerLabel(question: BankDetail["questions"][number]) {
  const optionMap: Record<string, string | null | undefined> = {
    A: question.option_a,
    B: question.option_b,
    C: question.option_c,
    D: question.option_d,
  };
  const optionText = optionMap[question.correct_answer];
  return optionText ? `${question.correct_answer}：${optionText}` : question.correct_answer;
}

function renderOptions(question: BankDetail["questions"][number]) {
  const options = [
    { key: "A", text: question.option_a },
    { key: "B", text: question.option_b },
    { key: "C", text: question.option_c },
    { key: "D", text: question.option_d },
  ].filter((item) => item.text);

  return (
    <Space direction="vertical" size={2}>
      {options.map((item) => (
        <Text key={item.key}>{`${item.key}. ${item.text}`}</Text>
      ))}
    </Space>
  );
}

function mapQuestionToForm(question: BankDetail["questions"][number]): QuestionFormValues {
  return {
    category: question.category,
    questionType: question.question_type as "single" | "judge",
    sourceNo: question.source_no ?? "",
    stem: question.stem,
    optionA: question.option_a,
    optionB: question.option_b,
    optionC: question.option_c ?? "",
    optionD: question.option_d ?? "",
    correctAnswer: question.correct_answer as "A" | "B" | "C" | "D",
  };
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function suggestUniqueVersion(existingVersions: string[], currentVersion: string) {
  const used = new Set(existingVersions.map((item) => normalizeText(item)));
  let candidate = currentVersion.trim() || "v1.0";

  if (!used.has(normalizeText(candidate))) {
    return candidate;
  }

  const matched = candidate.match(/^(.*?)(\d+)(?!.*\d)/);
  if (matched) {
    const prefix = matched[1];
    const digits = matched[2];
    let nextNumber = Number(digits);

    do {
      nextNumber += 1;
      candidate = `${prefix}${String(nextNumber).padStart(digits.length, "0")}`;
    } while (used.has(normalizeText(candidate)));

    return candidate;
  }

  let index = 2;
  candidate = `${candidate}-2`;
  while (used.has(normalizeText(candidate))) {
    index += 1;
    candidate = `${currentVersion.trim()}-${index}`;
  }
  return candidate;
}

export default function BanksView({
  token,
  banks,
  importJob,
  setImportJob,
  setSelectedBankId,
  setBankDetail,
  bankDetail,
  detailLoading,
  onReload,
  onNotify,
}: Props) {
  const [questionForm] = Form.useForm<QuestionFormValues>();
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [publishingBankId, setPublishingBankId] = useState("");
  const [disablingBankId, setDisablingBankId] = useState("");
  const [deletingBankId, setDeletingBankId] = useState("");
  const [deletingQuestionId, setDeletingQuestionId] = useState("");
  const [banksPageSize, setBanksPageSize] = useState(5);
  const [questionsPageSize, setQuestionsPageSize] = useState(10);
  const [deleteConfirmBank, setDeleteConfirmBank] = useState<QuestionBank | null>(null);
  const [bankKeyword, setBankKeyword] = useState("");
  const [questionKeyword, setQuestionKeyword] = useState("");
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  async function loadBankDetail(bankId: string) {
    const detail = await request<BankDetail>(`/api/admin/question-banks/${bankId}`, undefined, token);
    setBankDetail(detail);
    setSelectedBankId(bankId);
    return detail;
  }

  const filteredBanks = useMemo(() => {
    const keyword = bankKeyword.trim().toLowerCase();
    if (!keyword) return banks;
    return banks.filter((bank) => (
      bank.name.toLowerCase().includes(keyword)
      || bank.version.toLowerCase().includes(keyword)
      || bank.status.toLowerCase().includes(keyword)
    ));
  }, [bankKeyword, banks]);

  const filteredQuestions = useMemo(() => {
    const keyword = questionKeyword.trim().toLowerCase();
    if (!bankDetail) return [];
    if (!keyword) return bankDetail.questions;
    return bankDetail.questions.filter((question) => (
      question.category.toLowerCase().includes(keyword)
      || question.stem.toLowerCase().includes(keyword)
      || String(question.source_no ?? "").toLowerCase().includes(keyword)
      || questionTypeLabel(question.question_type).toLowerCase().includes(keyword)
    ));
  }, [bankDetail, questionKeyword]);

  const sameNameBankVersions = useMemo(() => {
    if (!importJob) return [];
    const normalizedName = normalizeText(importJob.bankName);
    if (!normalizedName) return [];
    return banks
      .filter((bank) => normalizeText(bank.name) === normalizedName)
      .map((bank) => bank.version);
  }, [banks, importJob]);

  const importVersionConflict = useMemo(() => {
    if (!importJob) return false;
    const normalizedVersion = normalizeText(importJob.bankVersion);
    if (!normalizedVersion) return false;
    return sameNameBankVersions.some((version) => normalizeText(version) === normalizedVersion);
  }, [importJob, sameNameBankVersions]);

  const suggestedImportVersion = useMemo(() => {
    if (!importJob) return "";
    return suggestUniqueVersion(sameNameBankVersions, importJob.bankVersion);
  }, [importJob, sameNameBankVersions]);

  async function downloadTemplate() {
    try {
      const response = await fetch(`${API_BASE}/api/admin/question-banks/template`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "模板下载失败" }));
        throw new Error(error.message ?? "模板下载失败");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "question-bank-template.xlsx";
      link.click();
      window.URL.revokeObjectURL(url);
      onNotify("success", "模板已下载");
    } catch (error) {
      onNotify("error", (error as Error).message);
    }
  }

  async function handleImportFile(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`${API_BASE}/api/admin/import-jobs/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) {
        onNotify("error", result.message ?? "上传失败");
        return false;
      }
      setImportJob(result);
      onNotify(
        result.canImport ? "success" : "warning",
        result.canImport ? "题库校验通过，可继续导入" : "题库存在校验问题，请先修正",
      );
    } catch (error) {
      onNotify("error", (error as Error).message || "上传失败");
    } finally {
      setUploading(false);
    }
    return false;
  }

  async function confirmImport() {
    if (!importJob) return;
    const bankName = importJob.bankName.trim();
    const bankVersion = importJob.bankVersion.trim();
    if (!bankName) {
      onNotify("warning", "请先填写题库名称");
      return;
    }
    if (!bankVersion) {
      onNotify("warning", "请先填写题库版本");
      return;
    }
    setImporting(true);
    try {
      const result = await request<{ bankId: string }>(
        `/api/admin/import-jobs/${importJob.jobId}/import`,
        {
          method: "POST",
          body: JSON.stringify({ bankName, bankVersion }),
        },
        token,
      );
      await onReload();
      await loadBankDetail(result.bankId);
      setImportJob(null);
      onNotify("success", `导入成功：${bankName} ${bankVersion}`.trim());
    } catch (error) {
      onNotify("error", `导入失败：${(error as Error).message}`);
    } finally {
      setImporting(false);
    }
  }

  async function updateBankStatus(bankId: string, action: "publish" | "disable") {
    if (action === "publish") setPublishingBankId(bankId);
    if (action === "disable") setDisablingBankId(bankId);
    try {
      await request(`/api/admin/question-banks/${bankId}/${action}`, { method: "POST" }, token);
      await onReload();
      await loadBankDetail(bankId);
      onNotify("success", action === "publish" ? "题库已发布" : "题库已停用");
    } catch (error) {
      onNotify("error", `${action === "publish" ? "发布失败" : "停用失败"}：${(error as Error).message}`);
    } finally {
      if (action === "publish") setPublishingBankId("");
      if (action === "disable") setDisablingBankId("");
    }
  }

  async function deleteBank(bank: QuestionBank) {
    setDeletingBankId(bank.id);
    try {
      await request(`/api/admin/question-banks/${bank.id}`, { method: "DELETE" }, token);
      if (bankDetail?.id === bank.id) {
        setSelectedBankId("");
        setBankDetail(null);
      }
      await onReload();
      onNotify("success", `已删除题库 ${bank.name} / ${bank.version}`);
      setDeleteConfirmBank(null);
    } catch (error) {
      onNotify("error", `删除失败：${(error as Error).message}`);
    } finally {
      setDeletingBankId("");
    }
  }

  function openCreateQuestion() {
    if (!bankDetail) {
      onNotify("warning", "请先选择题库");
      return;
    }
    setEditingQuestionId(null);
    questionForm.setFieldsValue({
      category: "",
      questionType: "single",
      sourceNo: "",
      stem: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correctAnswer: "A",
    });
    setQuestionModalOpen(true);
  }

  function openEditQuestion(question: BankDetail["questions"][number]) {
    setEditingQuestionId(question.id);
    questionForm.setFieldsValue(mapQuestionToForm(question));
    setQuestionModalOpen(true);
  }

  async function submitQuestion(values: QuestionFormValues) {
    if (!bankDetail) return;
    setSavingQuestion(true);
    try {
      const payload = {
        category: values.category,
        questionType: values.questionType,
        sourceNo: values.sourceNo?.trim() || null,
        stem: values.stem,
        optionA: values.optionA,
        optionB: values.optionB,
        optionC: values.questionType === "judge" ? null : values.optionC?.trim() || null,
        optionD: values.questionType === "judge" ? null : values.optionD?.trim() || null,
        correctAnswer: values.correctAnswer,
      };

      if (editingQuestionId) {
        await request(`/api/admin/question-banks/${bankDetail.id}/questions/${editingQuestionId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        }, token);
        onNotify("success", "题目已更新");
      } else {
        await request(`/api/admin/question-banks/${bankDetail.id}/questions`, {
          method: "POST",
          body: JSON.stringify(payload),
        }, token);
        onNotify("success", "题目已新增");
      }

      await onReload();
      await loadBankDetail(bankDetail.id);
      setQuestionModalOpen(false);
      questionForm.resetFields();
    } catch (error) {
      onNotify("error", (error as Error).message);
    } finally {
      setSavingQuestion(false);
    }
  }

  async function removeQuestion(question: BankDetail["questions"][number]) {
    if (!bankDetail) return;
    setDeletingQuestionId(question.id);
    try {
      await request(`/api/admin/question-banks/${bankDetail.id}/questions/${question.id}`, { method: "DELETE" }, token);
      await onReload();
      await loadBankDetail(bankDetail.id);
      onNotify("success", `已删除题目${question.source_no ? ` ${question.source_no}` : ""}`);
    } catch (error) {
      onNotify("error", (error as Error).message);
    } finally {
      setDeletingQuestionId("");
    }
  }

  const currentQuestionType = Form.useWatch("questionType", questionForm) ?? "single";

  return (
    <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
      <Col xs={24} xl={10}>
        <Card
          title="题库导入"
          extra={<Button icon={<FileExcelOutlined />} onClick={() => void downloadTemplate()}>下载模板</Button>}
        >
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            <Upload beforeUpload={(file) => handleImportFile(file)} maxCount={1} accept=".xlsx" showUploadList={false}>
              <Button type="primary" icon={<CloudUploadOutlined />} loading={uploading} block>
                上传 Excel 并校验
              </Button>
            </Upload>
            {importJob ? (
              <>
                <Descriptions size="small" bordered column={1}>
                  <Descriptions.Item label="题库版本">{importJob.bankVersion || "未识别"}</Descriptions.Item>
                  <Descriptions.Item label="统计">
                    总行数 {importJob.totalRows} / 通过 {importJob.successRows} / 失败 {importJob.failedRows}
                  </Descriptions.Item>
                </Descriptions>
                {importJob.canImport ? (
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <div>
                      <Text style={{ display: "block", marginBottom: 8 }}>题库名称</Text>
                      <Input
                        placeholder="请输入本次导入的题库名称"
                        value={importJob.bankName}
                        onChange={(event) => setImportJob({ ...importJob, bankName: event.target.value })}
                      />
                    </div>
                    <div>
                      <Text style={{ display: "block", marginBottom: 8 }}>题库版本</Text>
                      <Space direction="vertical" style={{ width: "100%" }} size="small">
                        <Input
                          placeholder="请输入本次导入的题库版本，如 v1.1"
                          value={importJob.bankVersion}
                          status={importVersionConflict ? "error" : undefined}
                          onChange={(event) => setImportJob({ ...importJob, bankVersion: event.target.value })}
                        />
                        {importVersionConflict ? (
                          <Alert
                            type="warning"
                            showIcon
                            message="当前题库名称和版本号已存在"
                            description={(
                              <Space wrap>
                                <Text>{`建议改为：${suggestedImportVersion}`}</Text>
                                <Button
                                  size="small"
                                  onClick={() => setImportJob({ ...importJob, bankVersion: suggestedImportVersion })}
                                >
                                  使用建议版本
                                </Button>
                              </Space>
                            )}
                          />
                        ) : null}
                      </Space>
                    </div>
                    <Button type="primary" loading={importing} onClick={() => void confirmImport()}>
                      确认导入
                    </Button>
                  </Space>
                ) : (
                  <Alert
                    type="warning"
                    showIcon
                    message="校验失败"
                    description={
                      <Space direction="vertical">
                        {importJob.errors.slice(0, 8).map((item) => (
                          <Text key={`${item.row}-${item.column}`}>{`第 ${item.row} 行 / ${item.column}：${item.message}`}</Text>
                        ))}
                      </Space>
                    }
                  />
                )}
              </>
            ) : (
              <Alert type="info" showIcon message="支持标准 Excel 模板导入，上传后会先校验，再允许导入。" />
            )}
          </Space>
        </Card>
      </Col>
      <Col xs={24} xl={14}>
        <Card
          title="题库版本"
          extra={(
            <Input
              allowClear
              placeholder="按题库名称/版本/状态搜索"
              style={{ width: 260 }}
              value={bankKeyword}
              onChange={(event) => setBankKeyword(event.target.value)}
            />
          )}
        >
          <Table
            rowKey="id"
            pagination={{
              pageSize: banksPageSize,
              showSizeChanger: true,
              pageSizeOptions: [5, 10, 20, 50],
              onShowSizeChange: (_, size) => setBanksPageSize(size),
            }}
            dataSource={filteredBanks}
            columns={[
              {
                title: "题库",
                render: (_, record: QuestionBank) => (
                  <Button type="link" onClick={() => void loadBankDetail(record.id)}>
                    {record.name} / {record.version}
                  </Button>
                ),
              },
              { title: "状态", dataIndex: "status", render: (value: string) => statusTag(value) },
              { title: "总题数", dataIndex: "totalCount" },
              {
                title: "操作",
                render: (_, record: QuestionBank) => (
                  <Space>
                    <Button
                      size="small"
                      type={record.status === "published" ? "default" : "primary"}
                      disabled={record.status === "published" || disablingBankId === record.id}
                      loading={publishingBankId === record.id}
                      onClick={() => void updateBankStatus(record.id, "publish")}
                    >
                      {record.status === "published" ? "已发布" : "发布"}
                    </Button>
                    <Button
                      size="small"
                      danger
                      disabled={record.status === "disabled" || publishingBankId === record.id}
                      loading={disablingBankId === record.id}
                      onClick={() => void updateBankStatus(record.id, "disable")}
                    >
                      {record.status === "disabled" ? "已停用" : "停用"}
                    </Button>
                    <Button
                      size="small"
                      danger
                      ghost
                      loading={deletingBankId === record.id}
                      disabled={publishingBankId === record.id || disablingBankId === record.id}
                      onClick={() => {
                        setDeleteConfirmBank(record);
                      }}
                    >
                      删除
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        </Card>
      </Col>
      <Col span={24}>
        <Card
          title={bankDetail ? `${bankDetail.name} / ${bankDetail.version}` : "题库详情"}
          extra={bankDetail ? (
            <Space>
              <Input
                allowClear
                placeholder="按题号/分类/题干搜索题目"
                style={{ width: 280 }}
                value={questionKeyword}
                onChange={(event) => setQuestionKeyword(event.target.value)}
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreateQuestion}>
                新增题目
              </Button>
            </Space>
          ) : null}
        >
          <Spin spinning={detailLoading}>
            {bankDetail ? (
              <Space direction="vertical" style={{ width: "100%" }} size="large">
                <Descriptions bordered size="small" column={{ xs: 1, md: 3 }}>
                  <Descriptions.Item label="状态">{statusTag(bankDetail.status)}</Descriptions.Item>
                  <Descriptions.Item label="总题数">{bankDetail.totalCount}</Descriptions.Item>
                  <Descriptions.Item label="分类数">{bankDetail.categories.length}</Descriptions.Item>
                </Descriptions>
                <Row gutter={[12, 12]}>
                  {bankDetail.categories.map((item) => (
                    <Col xs={12} md={8} xl={6} key={item.category}>
                      <Card size="small">
                        <Statistic title={item.category} value={item.count} />
                      </Card>
                    </Col>
                  ))}
                </Row>
                <Table
                  rowKey="id"
                  pagination={{
                    pageSize: questionsPageSize,
                    showSizeChanger: true,
                    pageSizeOptions: [10, 20, 50, 100],
                    onShowSizeChange: (_, size) => setQuestionsPageSize(size),
                  }}
                  dataSource={filteredQuestions}
                  columns={[
                    { title: "分类", dataIndex: "category", width: 120 },
                    { title: "题型", dataIndex: "question_type", width: 100, render: (value: string) => questionTypeLabel(value) },
                    { title: "题号", dataIndex: "source_no", width: 100, render: (value: string | null) => value || "-" },
                    { title: "题干", dataIndex: "stem", width: 260 },
                    { title: "选项", render: (_, record: BankDetail["questions"][number]) => renderOptions(record), width: 240 },
                    { title: "答案", render: (_, record: BankDetail["questions"][number]) => answerLabel(record), width: 180 },
                    {
                      title: "操作",
                      width: 160,
                      render: (_, record: BankDetail["questions"][number]) => (
                        <Space>
                          <Button size="small" icon={<EditOutlined />} onClick={() => openEditQuestion(record)}>
                            修改
                          </Button>
                          <Popconfirm
                            title="删除题目"
                            description={`确认删除${record.source_no ? `题号 ${record.source_no}` : "该题"}吗？相关答题记录也会一并删除。`}
                            okText="删除"
                            cancelText="取消"
                            onConfirm={() => void removeQuestion(record)}
                          >
                            <Button size="small" danger icon={<DeleteOutlined />} loading={deletingQuestionId === record.id}>
                              删除
                            </Button>
                          </Popconfirm>
                        </Space>
                      ),
                    },
                  ]}
                />
              </Space>
            ) : (
              <Alert type="info" showIcon message="点击上方题库记录查看详细信息" />
            )}
          </Spin>
        </Card>
      </Col>

      <Modal
        open={deleteConfirmBank !== null}
        title={deleteConfirmBank ? `删除题库：${deleteConfirmBank.name} / ${deleteConfirmBank.version}` : "删除题库"}
        onCancel={() => {
          setDeleteConfirmBank(null);
        }}
        onOk={() => deleteConfirmBank && void deleteBank(deleteConfirmBank)}
        okText="确认删除"
        cancelText="取消"
        okButtonProps={{
          danger: true,
          loading: deleteConfirmBank ? deletingBankId === deleteConfirmBank.id : false,
        }}
        destroyOnHidden
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            该操作会删除题库本身，以及相关题目、练习记录、错题记录，且无法恢复。
          </Paragraph>
          <Paragraph style={{ marginBottom: 0 }}>
            确认后将立即删除当前选中的整套题库。
          </Paragraph>
        </Space>
      </Modal>

      <Modal
        open={questionModalOpen}
        title={editingQuestionId ? "修改题目" : "新增题目"}
        onCancel={() => {
          setQuestionModalOpen(false);
          setEditingQuestionId(null);
          questionForm.resetFields();
        }}
        onOk={() => void questionForm.submit()}
        okText={editingQuestionId ? "保存修改" : "确认新增"}
        cancelText="取消"
        okButtonProps={{ loading: savingQuestion }}
        width={760}
        destroyOnHidden
      >
        <Form
          form={questionForm}
          layout="vertical"
          onFinish={(values) => void submitQuestion(values)}
          initialValues={{ questionType: "single", correctAnswer: "A" }}
        >
          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item label="分类" name="category" rules={[{ required: true, message: "请输入分类" }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="题型" name="questionType" rules={[{ required: true, message: "请选择题型" }]}>
                <Select
                  options={[
                    { value: "single", label: "单选题" },
                    { value: "judge", label: "判断题" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="题号" name="sourceNo">
                <Input placeholder="可选" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="正确答案" name="correctAnswer" rules={[{ required: true, message: "请选择正确答案" }]}>
                <Select
                  options={
                    currentQuestionType === "judge"
                      ? [
                          { value: "A", label: "A" },
                          { value: "B", label: "B" },
                        ]
                      : [
                          { value: "A", label: "A" },
                          { value: "B", label: "B" },
                          { value: "C", label: "C" },
                          { value: "D", label: "D" },
                        ]
                  }
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="题干" name="stem" rules={[{ required: true, message: "请输入题干" }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item label="选项 A" name="optionA" rules={[{ required: true, message: "请输入选项 A" }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="选项 B" name="optionB" rules={[{ required: true, message: "请输入选项 B" }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="选项 C"
                name="optionC"
                rules={currentQuestionType === "single" ? [{ required: true, message: "单选题请填写选项 C" }] : []}
              >
                <Input disabled={currentQuestionType === "judge"} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="选项 D"
                name="optionD"
                rules={currentQuestionType === "single" ? [{ required: true, message: "单选题请填写选项 D" }] : []}
              >
                <Input disabled={currentQuestionType === "judge"} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Row>
  );
}

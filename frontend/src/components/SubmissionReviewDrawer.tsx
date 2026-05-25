import { Button, Card, Descriptions, Drawer, Form, Input, InputNumber, Space, Tag, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { cabinetApi, type SubmissionDetail } from "../api/cabinet";
import { stepsApi } from "../api/courses";
import RichHtmlViewer from "./RichHtmlViewer";

type Props = {
  submissionId: string | null;
  open: boolean;
  onClose: () => void;
  canGrade?: boolean;
  onGraded?: () => void;
};

function TestCasePayloadView({ payload }: { payload: Record<string, unknown> }) {
  const fields: [string, string][] = [
    ["ID", "test_case_id"],
    ["Название", "title"],
    ["Описание", "description"],
    ["Предусловия", "preconditions"],
    ["Шаги", "execution_steps"],
    ["Ожидаемый результат", "expected_result"],
    ["Приоритет", "priority"],
    ["Тип тестирования", "testing_type"],
  ];
  return (
    <Descriptions column={1} size="small" bordered>
      {fields.map(([label, key]) => (
        <Descriptions.Item key={key} label={label}>
          {String(payload[key] ?? "—")}
        </Descriptions.Item>
      ))}
    </Descriptions>
  );
}

export default function SubmissionReviewDrawer({
  submissionId,
  open,
  onClose,
  canGrade = false,
  onGraded,
}: Props) {
  const [detail, setDetail] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!open || !submissionId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    cabinetApi
      .submissionDetail(submissionId)
      .then((d) => {
        setDetail(d);
        form.setFieldsValue({
          score: d.score ? Number(d.score) : 0,
          feedback: d.feedback || "",
        });
      })
      .catch(() => message.error("Не удалось загрузить работу"))
      .finally(() => setLoading(false));
  }, [open, submissionId, form]);

  const submitGrade = async () => {
    if (!submissionId) return;
    const values = await form.validateFields();
    try {
      await stepsApi.grade(submissionId, values);
      message.success("Оценка сохранена");
      onGraded?.();
      onClose();
    } catch {
      message.error("Ошибка сохранения");
    }
  };

  const llmScore = detail?.llm_score ?? detail?.payload?.llm_score;
  const llmFeedback = detail?.llm_feedback ?? detail?.payload?.llm_feedback;

  return (
    <Drawer
      title={detail ? `${detail.user_name} — ${detail.step_title}` : "Работа"}
      open={open}
      onClose={onClose}
      width={720}
      loading={loading}
    >
      {detail && (
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div>
            <Typography.Text type="secondary">
              {detail.course_title} → {detail.lesson_title}
            </Typography.Text>
            <div>
              <Tag>{detail.step_type}</Tag>
              <Tag color={detail.status === "graded" ? "green" : "gold"}>{detail.status}</Tag>
            </div>
          </div>

          {detail.step_content?.condition_html ? (
            <Card size="small" title="Условие">
              <RichHtmlViewer html={String(detail.step_content.condition_html)} />
            </Card>
          ) : null}

          <Card size="small" title="Сдача студента">
            {detail.step_type === "test_case" ? (
              <TestCasePayloadView payload={detail.payload} />
            ) : detail.step_type === "quiz" ? (
              <Typography.Text>
                Выбранные варианты:{" "}
                {JSON.stringify((detail.payload as { selected?: number[] }).selected ?? [])}
              </Typography.Text>
            ) : (
              <pre style={{ fontSize: 12 }}>{JSON.stringify(detail.payload, null, 2)}</pre>
            )}
          </Card>

          <Card size="small" title="Оценка ИИ">
            {llmScore != null || llmFeedback ? (
              <>
                {llmScore != null && (
                  <Typography.Paragraph>Баллы (ИИ): {String(llmScore)}</Typography.Paragraph>
                )}
                {llmFeedback && <Typography.Paragraph>{String(llmFeedback)}</Typography.Paragraph>}
              </>
            ) : (
              <Typography.Text type="secondary">ИИ не подключён (фаза 2)</Typography.Text>
            )}
          </Card>

          {canGrade && detail.status === "submitted" && (
            <Card size="small" title="Итоговая оценка преподавателя">
              <Form form={form} layout="vertical">
                <Form.Item name="score" label="Баллы" rules={[{ required: true }]}>
                  <InputNumber min={0} max={Number(detail.max_score) || undefined} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item name="feedback" label="Комментарий">
                  <Input.TextArea rows={3} />
                </Form.Item>
                <Button type="primary" onClick={submitGrade}>
                  Сохранить оценку
                </Button>
              </Form>
            </Card>
          )}

          {detail.status === "graded" && (
            <Card size="small" title="Оценка">
              <Typography.Paragraph>
                {detail.score} / {detail.max_score}
                {detail.grading_source === "llm" && <Tag color="blue">ИИ</Tag>}
                {detail.grading_source === "manual" && <Tag>Преподаватель</Tag>}
              </Typography.Paragraph>
              {detail.feedback && <Typography.Paragraph>{detail.feedback}</Typography.Paragraph>}
            </Card>
          )}
        </Space>
      )}
    </Drawer>
  );
}

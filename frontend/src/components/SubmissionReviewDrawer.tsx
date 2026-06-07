import {
  Button,
  Card,
  Collapse,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { useEffect, useState } from "react";
import { cabinetApi, type SubmissionDetail } from "../api/cabinet";
import { stepsApi } from "../api/courses";
import { ru } from "../i18n/ru";
import type { LlmGrade } from "../lib/testCaseRubric";
import RichHtmlViewer from "./RichHtmlViewer";

type Props = {
  submissionId: string | null;
  open: boolean;
  onClose: () => void;
  canGrade?: boolean;
  onGraded?: () => void;
};

function MatchSubmissionView({
  payload,
  pairs,
}: {
  payload: Record<string, unknown>;
  pairs: { left: string; right: string }[];
}) {
  const mapping = (payload.mapping as number[]) ?? [];
  return (
    <Descriptions column={1} size="small" bordered>
      {pairs.map((p, i) => {
        const chosen = mapping[i];
        const chosenRight = chosen !== undefined ? pairs[chosen]?.right : "—";
        const ok = chosen === i;
        return (
          <Descriptions.Item
            key={i}
            label={
              <>
                {p.left} {ok ? "✓" : "✗"}
              </>
            }
          >
            {chosenRight} {ok ? "" : `(верно: ${p.right})`}
          </Descriptions.Item>
        );
      })}
    </Descriptions>
  );
}

function TestCasePayloadView({ payload }: { payload: Record<string, unknown> }) {
  const fields: [string, string][] = [
    ["Название", "title"],
    ["Предусловия", "preconditions"],
    ["Шаги", "execution_steps"],
    ["Ожидаемый результат", "expected_result"],
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

function FreeAnswerPayloadView({ payload }: { payload: Record<string, unknown> }) {
  const answer = String(payload.answer ?? "").trim();
  return (
    <Descriptions column={1} size="small" bordered>
      <Descriptions.Item label={ru.freeAnswer.answerLabel}>
        {answer || "—"}
      </Descriptions.Item>
    </Descriptions>
  );
}

function LlmGradeBlock({ llm }: { llm: LlmGrade }) {
  const labels = { ...ru.testCase.criterionLabels, ...ru.freeAnswer.criterionLabels } as Record<
    string,
    string
  >;
  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      {llm.total_percent != null && (
        <Typography.Paragraph>
          {ru.testCase.totalPercent}: {Math.round(llm.total_percent)}%
        </Typography.Paragraph>
      )}
      {"band_min_percent" in llm &&
        llm.band_min_percent != null &&
        llm.awarded_points != null && (
          <Typography.Paragraph type="secondary">
            {ru.freeAnswer.scoreBandApplied
              .replace("{percent}", String(llm.band_min_percent))
              .replace("{points}", String(llm.awarded_points))}
          </Typography.Paragraph>
        )}
      {llm.summary && <Typography.Paragraph>{llm.summary}</Typography.Paragraph>}
      {llm.recommendations?.length ? (
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {llm.recommendations.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      ) : null}
      {llm.criteria?.length ? (
        <Collapse
          size="small"
          items={[
            {
              key: "c",
              label: ru.testCase.criteriaDetails,
              children: llm.criteria.map((c) => (
                <div key={c.id} style={{ marginBottom: 8 }}>
                  <Tag>{labels[c.id as keyof typeof labels] ?? c.id}</Tag> {c.percent}% — {c.comment}
                </div>
              )),
            },
          ]}
        />
      ) : null}
    </Space>
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

  const acceptAiGrade = async () => {
    if (!submissionId || !detail?.score) return;
    try {
      await stepsApi.grade(submissionId, {
        score: Number(detail.score),
        feedback: detail.feedback || "",
      });
      message.success("Оценка ИИ принята");
      onGraded?.();
      onClose();
    } catch {
      message.error("Ошибка сохранения");
    }
  };

  const payload = (detail?.payload ?? {}) as Record<string, unknown>;
  const llmGrade = (detail?.llm_grade ?? payload.llm_grade) as LlmGrade | undefined;
  const llmError = payload.llm_error as string | undefined;

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
              {detail.grading_source === "llm" && <Tag color="blue">ИИ</Tag>}
            </div>
          </div>

          {detail.step_content?.condition_html ? (
            <Card size="small" title="Условие">
              <RichHtmlViewer html={String(detail.step_content.condition_html)} />
            </Card>
          ) : null}
          {detail.step_type === "ui_practice" && detail.step_content?.task_html ? (
            <Card size="small" title={ru.uiPractice.objectTitle}>
              <RichHtmlViewer html={String(detail.step_content.task_html)} />
            </Card>
          ) : null}

          <Card size="small" title="Сдача студента">
            {detail.step_type === "test_case" || detail.step_type === "ui_practice" ? (
              <TestCasePayloadView payload={detail.payload} />
            ) : detail.step_type === "quiz" ? (
              <Typography.Text>
                Выбранные варианты:{" "}
                {JSON.stringify((detail.payload as { selected?: number[] }).selected ?? [])}
              </Typography.Text>
            ) : detail.step_type === "match" ? (
              <MatchSubmissionView
                payload={detail.payload}
                pairs={
                  (detail.step_content?.pairs as { left: string; right: string }[]) ?? []
                }
              />
            ) : detail.step_type === "free_answer" ? (
              <FreeAnswerPayloadView payload={detail.payload} />
            ) : (
              <pre style={{ fontSize: 12 }}>{JSON.stringify(detail.payload, null, 2)}</pre>
            )}
          </Card>

          <Card size="small" title="Оценка ИИ">
            {llmGrade ? (
              <LlmGradeBlock llm={llmGrade} />
            ) : llmError ? (
              <Typography.Text type="warning">{llmError}</Typography.Text>
            ) : (
              <Typography.Text type="secondary">{ru.cabinet.aiNotConnected}</Typography.Text>
            )}
          </Card>

          {canGrade && detail.grading_source === "llm" && detail.status === "graded" && (
            <Button onClick={acceptAiGrade}>{ru.testCase.acceptAiGrade}</Button>
          )}

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

          {canGrade && detail.status === "graded" && detail.grading_source === "llm" && (
            <Card size="small" title="Изменить оценку">
              <Form form={form} layout="vertical">
                <Form.Item name="score" label="Баллы" rules={[{ required: true }]}>
                  <InputNumber min={0} max={Number(detail.max_score) || undefined} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item name="feedback" label="Комментарий">
                  <Input.TextArea rows={3} />
                </Form.Item>
                <Button type="primary" onClick={submitGrade}>
                  Сохранить
                </Button>
              </Form>
            </Card>
          )}

          {detail.status === "graded" && !canGrade && (
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

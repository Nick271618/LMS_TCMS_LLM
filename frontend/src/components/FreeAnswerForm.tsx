import { Alert, Button, Collapse, Form, Input, Progress, Space, Tag, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { stepsApi, type StepSubmission } from "../api/courses";
import { ru } from "../i18n/ru";

type Props = { stepId: string };

type LlmGrade = {
  total_percent: number;
  awarded_points?: number;
  band_min_percent?: number | null;
  criteria: { id: string; percent: number; comment: string }[];
  summary: string;
  recommendations: string[];
};

function getLlmGrade(payload: Record<string, unknown> | undefined): LlmGrade | null {
  const g = payload?.llm_grade;
  if (!g || typeof g !== "object") return null;
  return g as LlmGrade;
}

export default function FreeAnswerForm({ stepId }: Props) {
  const [loading, setLoading] = useState(false);
  const [submission, setSubmission] = useState<StepSubmission | null>(null);
  const [showForm, setShowForm] = useState(true);
  const [form] = Form.useForm();

  const loadSubmission = () => {
    stepsApi
      .mySubmission(stepId)
      .then((s) => {
        setSubmission(s);
        const p = s.payload as Record<string, string>;
        form.setFieldsValue({ answer: p.answer ?? "" });
        setShowForm(s.status !== "graded" && s.status !== "submitted");
      })
      .catch(() => {
        setSubmission(null);
        setShowForm(true);
      });
  };

  useEffect(() => {
    loadSubmission();
  }, [stepId]);

  const onFinish = async (values: { answer: string }) => {
    setLoading(true);
    try {
      const s = await stepsApi.submitFreeAnswer(stepId, values.answer);
      setSubmission(s);
      setShowForm(false);
      if (s.status === "graded" && s.grading_source === "llm") {
        message.success(ru.freeAnswer.gradedByAi);
      } else if (s.status === "submitted") {
        message.warning(ru.freeAnswer.aiUnavailable);
      } else {
        message.success(ru.freeAnswer.submitted);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      message.error(msg || ru.freeAnswer.submitError);
    } finally {
      setLoading(false);
    }
  };

  const llm = getLlmGrade(submission?.payload as Record<string, unknown>);

  if (submission?.status === "graded" && !showForm) {
    return (
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <Alert
          type={submission.grading_source === "llm" ? "success" : "info"}
          message={`${ru.freeAnswer.scoreLabel}: ${submission.score} / ${submission.max_score}`}
          description={llm?.summary || submission.feedback}
        />
        {llm?.total_percent != null && (
          <div>
            <Typography.Text type="secondary">{ru.freeAnswer.totalPercent}</Typography.Text>
            <Progress percent={Math.round(llm.total_percent)} />
          </div>
        )}
        {llm?.band_min_percent != null && llm.awarded_points != null && (
          <Typography.Text type="secondary">
            {ru.freeAnswer.scoreBandApplied
              .replace("{percent}", String(llm.band_min_percent))
              .replace("{points}", String(llm.awarded_points))}
          </Typography.Text>
        )}
        {llm?.recommendations?.length ? (
          <div>
            <Typography.Title level={5}>{ru.freeAnswer.recommendations}</Typography.Title>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {llm.recommendations.map((r, i) => (
                <li key={i}>
                  <Typography.Text>{r}</Typography.Text>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {llm?.criteria?.length ? (
          <Collapse
            items={[
              {
                key: "criteria",
                label: ru.freeAnswer.criteriaDetails,
                children: (
                  <Space direction="vertical" style={{ width: "100%" }}>
                    {llm.criteria.map((c) => (
                      <div key={c.id}>
                        <Space>
                          <Typography.Text strong>
                            {ru.freeAnswer.criterionLabels[c.id as keyof typeof ru.freeAnswer.criterionLabels] ??
                              c.id}
                          </Typography.Text>
                          <Tag>{c.percent}%</Tag>
                        </Space>
                        <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
                          {c.comment}
                        </Typography.Paragraph>
                      </div>
                    ))}
                  </Space>
                ),
              },
            ]}
          />
        ) : null}
        <Button type="primary" onClick={() => setShowForm(true)}>
          {ru.freeAnswer.resubmit}
        </Button>
      </Space>
    );
  }

  if (submission?.status === "submitted" && !showForm) {
    const err = (submission.payload as Record<string, unknown>)?.llm_error;
    return (
      <Space direction="vertical" style={{ width: "100%" }}>
        <Alert
          type="warning"
          message={ru.freeAnswer.aiUnavailable}
          description={err ? String(err) : ru.freeAnswer.waitingTeacher}
        />
        <Button onClick={() => setShowForm(true)}>{ru.freeAnswer.resubmit}</Button>
      </Space>
    );
  }

  return (
    <Form form={form} layout="vertical" onFinish={onFinish}>
      {loading && (
        <Alert type="info" message={ru.freeAnswer.aiChecking} showIcon style={{ marginBottom: 16 }} />
      )}
      <Form.Item
        label={ru.freeAnswer.answerLabel}
        name="answer"
        rules={[{ required: true, message: ru.freeAnswer.errorEmptyAnswer }]}
      >
        <Input.TextArea rows={6} placeholder={ru.freeAnswer.answerPlaceholder} />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={loading} block size="large">
        {submission ? ru.freeAnswer.resubmit : ru.freeAnswer.submit}
      </Button>
      <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
        {ru.freeAnswer.submitHint}
      </Typography.Paragraph>
    </Form>
  );
}


import {
  Alert,
  Button,
  Collapse,
  Form,
  Input,
  Progress,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { useEffect, useState } from "react";
import { stepsApi, type StepSubmission } from "../api/courses";
import { ru } from "../i18n/ru";
import type { LlmGrade } from "../lib/testCaseRubric";

type Props = {
  stepId: string;
  submit?: (stepId: string, values: Record<string, string>) => Promise<StepSubmission>;
};

const criterionLabels: Record<string, string> = ru.testCase.criterionLabels;

function getLlmGrade(payload: Record<string, unknown> | undefined): LlmGrade | null {
  const g = payload?.llm_grade;
  if (!g || typeof g !== "object") return null;
  return g as LlmGrade;
}

function LlmResultView({
  submission,
  onResubmit,
}: {
  submission: StepSubmission;
  onResubmit: () => void;
}) {
  const llm = getLlmGrade(submission.payload as Record<string, unknown>);
  const isLlm = submission.grading_source === "llm";

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="middle">
      <Alert
        type={isLlm ? "success" : "info"}
        message={`${ru.testCase.scoreLabel}: ${submission.score} / ${submission.max_score}`}
        description={
          llm?.summary || submission.feedback || (isLlm ? "" : ru.testCase.waitingTeacher)
        }
      />
      {llm?.total_percent != null && (
        <div>
          <Typography.Text type="secondary">{ru.testCase.totalPercent}</Typography.Text>
          <Progress percent={Math.round(llm.total_percent)} />
        </div>
      )}
      {llm?.recommendations?.length ? (
        <div>
          <Typography.Title level={5}>{ru.testCase.recommendations}</Typography.Title>
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
              label: ru.testCase.criteriaDetails,
              children: (
                <Space direction="vertical" style={{ width: "100%" }}>
                  {llm.criteria.map((c) => (
                    <div key={c.id}>
                      <Space>
                        <Typography.Text strong>
                          {criterionLabels[c.id] ?? c.id}
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
      {submission.grading_source === "manual" && (
        <Typography.Text type="secondary">{ru.testCase.teacherOverride}</Typography.Text>
      )}
      <Button type="primary" onClick={onResubmit}>
        {ru.testCase.resubmit}
      </Button>
    </Space>
  );
}

export default function TestCaseForm({ stepId, submit }: Props) {
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
        form.setFieldsValue({
          title: p.title ?? "",
          preconditions: p.preconditions ?? "",
          execution_steps: p.execution_steps ?? "",
          expected_result: p.expected_result ?? "",
        });
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

  const onFinish = async (values: Record<string, string>) => {
    setLoading(true);
    try {
      const submitFn = submit ?? stepsApi.submitTestCase;
      const s = await submitFn(stepId, values);
      setSubmission(s);
      setShowForm(false);
      if (s.status === "graded" && s.grading_source === "llm") {
        message.success(ru.testCase.gradedByAi);
      } else if (s.status === "submitted") {
        message.warning(ru.testCase.aiUnavailable);
      } else {
        message.success(ru.testCase.submitted);
      }
    } catch {
      message.error(ru.testCase.submitError);
    } finally {
      setLoading(false);
    }
  };

  if (submission?.status === "graded" && !showForm) {
    return (
      <LlmResultView submission={submission} onResubmit={() => setShowForm(true)} />
    );
  }

  if (submission?.status === "submitted" && !showForm) {
    const err = (submission.payload as Record<string, unknown>)?.llm_error;
    return (
      <Space direction="vertical" style={{ width: "100%" }}>
        <Alert
          type="warning"
          message={ru.testCase.aiUnavailable}
          description={err ? String(err) : ru.testCase.waitingTeacher}
        />
        <Button onClick={() => setShowForm(true)}>{ru.testCase.resubmit}</Button>
      </Space>
    );
  }

  return (
    <Form form={form} layout="vertical" onFinish={onFinish}>
      {loading && (
        <Alert type="info" message={ru.testCase.aiChecking} showIcon style={{ marginBottom: 16 }} />
      )}
      <Form.Item label={ru.testCase.fieldTitle} name="title" rules={[{ required: true }]}>
        <Input placeholder={ru.testCase.fieldTitleHint} />
      </Form.Item>
      <Form.Item label={ru.testCase.fieldPreconditions} name="preconditions">
        <Input.TextArea rows={2} placeholder={ru.testCase.fieldPreconditionsHint} />
      </Form.Item>
      <Form.Item
        label={ru.testCase.fieldSteps}
        name="execution_steps"
        rules={[{ required: true }]}
      >
        <Input.TextArea rows={4} placeholder={ru.testCase.fieldStepsHint} />
      </Form.Item>
      <Form.Item
        label={ru.testCase.fieldExpected}
        name="expected_result"
        rules={[{ required: true }]}
      >
        <Input.TextArea rows={2} />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={loading} block size="large">
        {submission ? ru.testCase.resubmit : ru.testCase.submit}
      </Button>
      <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
        {ru.testCase.submitHint}
      </Typography.Paragraph>
    </Form>
  );
}

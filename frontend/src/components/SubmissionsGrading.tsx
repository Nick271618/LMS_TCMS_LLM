import { Button, Form, Input, InputNumber, List, Modal, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { stepsApi, type StepSubmission } from "../api/courses";

type Props = { stepId: string; open: boolean; onClose: () => void };

export default function SubmissionsGrading({ stepId, open, onClose }: Props) {
  const [subs, setSubs] = useState<StepSubmission[]>([]);
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const load = () => {
    stepsApi.listSubmissions(stepId).then(setSubs).catch(() => message.error("Ошибка загрузки"));
  };

  useEffect(() => {
    if (open) load();
  }, [open, stepId]);

  const submitGrade = async () => {
    if (!gradingId) return;
    const values = await form.validateFields();
    try {
      await stepsApi.grade(gradingId, values);
      message.success("Оценка сохранена");
      setGradingId(null);
      form.resetFields();
      load();
    } catch {
      message.error("Ошибка");
    }
  };

  return (
    <Modal title="Работы студентов" open={open} onCancel={onClose} footer={null} width={720}>
      <List
        dataSource={subs}
        locale={{ emptyText: "Пока нет сдач" }}
        renderItem={(s) => (
          <List.Item
            actions={[
              s.status !== "graded" && (
                <Button
                  key="g"
                  type="link"
                  onClick={() => {
                    setGradingId(s.id);
                    form.setFieldsValue({ score: 0, feedback: "" });
                  }}
                >
                  Оценить
                </Button>
              ),
            ].filter(Boolean)}
          >
            <List.Item.Meta
              title={`${s.user_name} (${s.user_email})`}
              description={
                <>
                  <Typography.Text type="secondary">Статус: {s.status}</Typography.Text>
                  {s.status === "graded" && (
                    <div>
                      Баллы: {s.score}/{s.max_score} — {s.feedback}
                    </div>
                  )}
                  <pre style={{ fontSize: 12, marginTop: 8 }}>
                    {JSON.stringify(s.payload, null, 2)}
                  </pre>
                </>
              }
            />
          </List.Item>
        )}
      />
      <Modal title="Выставить оценку" open={!!gradingId} onOk={submitGrade} onCancel={() => setGradingId(null)}>
        <Form form={form} layout="vertical">
          <Form.Item name="score" label="Баллы" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="feedback" label="Комментарий">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Modal>
  );
}

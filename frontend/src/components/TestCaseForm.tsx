import { Alert, Button, Form, Input, Select, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { stepsApi, type StepSubmission } from "../api/courses";

const PRIORITY = [
  { value: "low", label: "Низкий" },
  { value: "medium", label: "Средний" },
  { value: "high", label: "Высокий" },
  { value: "critical", label: "Критический" },
];
const TESTING = [
  { value: "functional", label: "Функциональное" },
  { value: "integration", label: "Интеграционное" },
  { value: "regression", label: "Регрессионное" },
  { value: "smoke", label: "Smoke" },
  { value: "acceptance", label: "Приёмочное" },
  { value: "negative", label: "Негативное" },
];

type Props = { stepId: string };

export default function TestCaseForm({ stepId }: Props) {
  const [loading, setLoading] = useState(false);
  const [submission, setSubmission] = useState<StepSubmission | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    stepsApi
      .mySubmission(stepId)
      .then((s) => {
        setSubmission(s);
        form.setFieldsValue(s.payload);
      })
      .catch(() => setSubmission(null));
  }, [stepId, form]);

  const onFinish = async (values: Record<string, string>) => {
    setLoading(true);
    try {
      const s = await stepsApi.submitTestCase(stepId, values);
      setSubmission(s);
      message.success("Отправлено на оценку");
    } catch {
      message.error("Не удалось отправить");
    } finally {
      setLoading(false);
    }
  };

  if (submission?.status === "graded") {
    return (
      <Alert
        type="success"
        message={`Оценено: ${submission.score} / ${submission.max_score}`}
        description={submission.feedback || "Комментарий преподавателя"}
      />
    );
  }

  if (submission?.status === "submitted") {
    return (
      <Alert
        type="info"
        message="Ожидает проверки преподавателем"
        description="Автопроверка ИИ будет подключена на Фазе 2."
      />
    );
  }

  return (
    <Form form={form} layout="vertical" onFinish={onFinish}>
      <Form.Item label="ID тест-кейса" name="test_case_id" rules={[{ required: true }]}>
        <Input placeholder="TC-001" />
      </Form.Item>
      <Form.Item label="Название тест-кейса" name="title" rules={[{ required: true }]}>
        <Input placeholder="Краткое и понятное название" />
      </Form.Item>
      <Form.Item label="Описание" name="description" rules={[{ required: true }]}>
        <Input.TextArea rows={3} placeholder="Подробное описание того, что тестируется" />
      </Form.Item>
      <Form.Item label="Предусловия" name="preconditions">
        <Input.TextArea rows={2} placeholder="Условия перед тестом" />
      </Form.Item>
      <Form.Item label="Шаги выполнения" name="execution_steps" rules={[{ required: true }]}>
        <Input.TextArea rows={4} placeholder={"1. Шаг первый\n2. Шаг второй"} />
      </Form.Item>
      <Form.Item label="Ожидаемый результат" name="expected_result" rules={[{ required: true }]}>
        <Input.TextArea rows={2} />
      </Form.Item>
      <Form.Item label="Приоритет" name="priority" rules={[{ required: true }]}>
        <Select options={PRIORITY} placeholder="Выберите приоритет" />
      </Form.Item>
      <Form.Item label="Тип тестирования" name="testing_type" rules={[{ required: true }]}>
        <Select options={TESTING} placeholder="Выберите тип" />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={loading} block size="large">
        Отправить на оценку
      </Button>
      <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
        Фаза 1: проверка преподавателем вручную.
      </Typography.Paragraph>
    </Form>
  );
}

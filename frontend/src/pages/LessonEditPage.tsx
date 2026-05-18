import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SubmissionsGrading from "../components/SubmissionsGrading";
import { lessonsApi, stepsApi, type Step, type StepType } from "../api/courses";

const STEP_TYPES: { value: StepType; label: string }[] = [
  { value: "text", label: "Текст" },
  { value: "quiz", label: "Тест" },
  { value: "test_case", label: "Тест-кейс" },
];

const defaultContent = (type: StepType): Record<string, unknown> => {
  if (type === "text") return { body_html: "<p>Теория</p>" };
  if (type === "quiz")
    return {
      condition_html: "<p>Вопрос</p>",
      options: ["Вариант 1", "Вариант 2"],
      correct_indices: [0],
      multiple: false,
    };
  return {
    condition_html: "<p>ТЗ: составьте тест-кейс</p>",
    rubric: "Полнота шагов, соответствие ТЗ, ожидаемый результат",
  };
};

export default function LessonEditPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Step | null>(null);
  const [form] = Form.useForm();
  const [gradeStepId, setGradeStepId] = useState<string | null>(null);

  const load = () => {
    if (!lessonId) return;
    setLoading(true);
    lessonsApi
      .steps(lessonId)
      .then(setSteps)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [lessonId]);

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue({
      step_type: "text",
      title: "",
      points: 1,
      content: defaultContent("text"),
    });
    setModalOpen(true);
  };

  const openEdit = (step: Step) => {
    setEditing(step);
    form.setFieldsValue({
      step_type: step.step_type,
      title: step.title,
      points: step.points,
      condition_html: step.content.condition_html || "",
      body_html: step.content.body_html || "",
      rubric: step.content.rubric || "",
      options: (step.content.options as string[])?.join("\n") || "",
      correct_index: (step.content.correct_indices as number[] | undefined)?.[0] ?? 0,
      multiple: step.content.multiple ?? false,
    });
    setModalOpen(true);
  };

  const buildContent = (values: Record<string, unknown>, type: StepType) => {
    if (type === "text") return { body_html: values.body_html };
    if (type === "quiz") {
      const options = String(values.options || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      return {
        condition_html: values.condition_html,
        options,
        correct_indices: [Number(values.correct_index)],
        multiple: values.multiple,
      };
    }
    return {
      condition_html: values.condition_html,
      rubric: values.rubric,
    };
  };

  const saveStep = async () => {
    const values = await form.validateFields();
    const step_type = values.step_type as StepType;
    const content = buildContent(values, step_type);
    const body = {
      step_type,
      title: values.title || `Шаг ${steps.length + 1}`,
      points: step_type === "text" ? 0 : values.points,
      order: editing?.order ?? steps.length,
      content,
    };
    try {
      if (editing) {
        await stepsApi.update(editing.id, body);
      } else if (lessonId) {
        await lessonsApi.addStep(lessonId, body);
      }
      message.success("Сохранено");
      setModalOpen(false);
      load();
    } catch {
      message.error("Ошибка сохранения");
    }
  };

  const removeStep = async (id: string) => {
    try {
      await stepsApi.delete(id);
      message.success("Удалено");
      load();
    } catch {
      message.error("Ошибка");
    }
  };

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Link to="/teach">← Преподавание</Link>
      <Typography.Title level={3}>Редактор урока</Typography.Title>

      <Card
        title="Шаги"
        extra={
          <Button type="primary" onClick={openCreate} disabled={steps.length >= 16}>
            + Добавить шаг
          </Button>
        }
        loading={loading}
      >
        <Space wrap>
          {steps.map((s, i) => (
            <Card
              key={s.id}
              size="small"
              style={{ width: 140, cursor: "pointer" }}
              onClick={() => openEdit(s)}
            >
              <Tag color={s.step_type === "test_case" ? "blue" : "default"}>{i + 1}</Tag>
              <div>{s.title || s.step_type}</div>
              {s.step_type === "test_case" && (
                <Button
                  type="link"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setGradeStepId(s.id);
                  }}
                >
                  Работы
                </Button>
              )}
              <Button
                type="link"
                danger
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  removeStep(s.id);
                }}
              >
                Удалить
              </Button>
            </Card>
          ))}
        </Space>
      </Card>

      <Modal
        title={editing ? "Редактировать шаг" : "Новый шаг"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={saveStep}
        width={640}
        okText="Сохранить"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="step_type" label="Тип" rules={[{ required: true }]}>
            <Select options={STEP_TYPES} disabled={!!editing} />
          </Form.Item>
          <Form.Item name="title" label="Название">
            <Input />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(p, c) => p.step_type !== c.step_type}>
            {({ getFieldValue }) =>
              getFieldValue("step_type") !== "text" ? (
                <Form.Item name="points" label="Баллы">
                  <InputNumber min={0} />
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) => {
              const t = getFieldValue("step_type") as StepType;
              if (t === "text") {
                return (
                  <Form.Item name="body_html" label="Текст (HTML)">
                    <Input.TextArea rows={6} />
                  </Form.Item>
                );
              }
              return (
                <Form.Item name="condition_html" label="Условие (HTML)">
                  <Input.TextArea rows={4} />
                </Form.Item>
              );
            }}
          </Form.Item>
          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) =>
              getFieldValue("step_type") === "quiz" ? (
                <>
                  <Form.Item name="options" label="Варианты (по одному на строку)">
                    <Input.TextArea rows={4} />
                  </Form.Item>
                  <Form.Item name="correct_index" label="Индекс правильного (с 0)">
                    <InputNumber min={0} />
                  </Form.Item>
                </>
              ) : null
            }
          </Form.Item>
          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) =>
              getFieldValue("step_type") === "test_case" ? (
                <Form.Item name="rubric" label="Рубрика для оценки (Фаза 2 — LLM)">
                  <Input.TextArea rows={3} />
                </Form.Item>
              ) : null
            }
          </Form.Item>
        </Form>
      </Modal>

      {gradeStepId && (
        <SubmissionsGrading
          stepId={gradeStepId}
          open={!!gradeStepId}
          onClose={() => setGradeStepId(null)}
        />
      )}
    </Space>
  );
}

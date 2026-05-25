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
import QuizStepEditor, {
  quizContentFromValue,
  quizValueFromContent,
  type QuizStepValue,
} from "../components/QuizStepEditor";
import RichTextEditor from "../components/RichTextEditor";
import SubmissionsGrading from "../components/SubmissionsGrading";
import { ru } from "../i18n/ru";
import { lessonsApi, stepsApi, type Step, type StepType } from "../api/courses";

const STEP_TYPES: { value: StepType; label: string }[] = [
  { value: "text", label: "Текст" },
  { value: "quiz", label: "Тест" },
  { value: "test_case", label: "Тест-кейс" },
];

const defaultQuizValue = (): QuizStepValue =>
  quizValueFromContent({
    condition_html:
      "<p>Вы можете изменить условие задания в этом поле и указать настройки ниже.</p><p>Чему равняется 1004 разделить на 2?</p>",
    options: ["52", "502", "520", "5002"],
    correct_indices: [1],
    multiple: false,
    option_feedback: ["", "", "", ""],
  });

const defaultContent = (type: StepType): Record<string, unknown> => {
  if (type === "text") return { body_html: "<p>Теория</p>" };
  if (type === "quiz") return quizContentFromValue(defaultQuizValue());
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
    const content = defaultContent("text");
    form.setFieldsValue({
      step_type: "text",
      title: "",
      points: 1,
      body_html: (content.body_html as string) || "<p>Теория</p>",
      condition_html: "",
      rubric: "",
      quiz_step: defaultQuizValue(),
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
      quiz_step:
        step.step_type === "quiz"
          ? quizValueFromContent(step.content as Record<string, unknown>)
          : defaultQuizValue(),
    });
    setModalOpen(true);
  };

  const buildContent = (values: Record<string, unknown>, type: StepType) => {
    if (type === "text") return { body_html: values.body_html };
    if (type === "quiz") {
      return quizContentFromValue(values.quiz_step as QuizStepValue);
    }
    return {
      condition_html: values.condition_html,
      rubric: values.rubric,
    };
  };

  const saveStep = async () => {
    const values = await form.validateFields();
    const step_type = values.step_type as StepType;
    if (step_type === "quiz") {
      const quiz = quizContentFromValue(values.quiz_step as QuizStepValue);
      if (quiz.options.length < 2) {
        message.error("Добавьте минимум два варианта ответа");
        return;
      }
      if (!quiz.correct_indices.length) {
        message.error("Отметьте хотя бы один правильный ответ");
        return;
      }
    }
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
        width={920}
        styles={{ body: { maxHeight: "calc(100vh - 200px)", overflowY: "auto" } }}
        okText="Сохранить"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="step_type" label="Тип" rules={[{ required: true }]}>
            <Select
              options={STEP_TYPES}
              disabled={!!editing}
              onChange={(t: StepType) => {
                if (t === "quiz" && !form.getFieldValue("quiz_step")) {
                  form.setFieldValue("quiz_step", defaultQuizValue());
                }
              }}
            />
          </Form.Item>
          <Form.Item name="title" label="Название">
            <Input />
          </Form.Item>
          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) => {
              const t = getFieldValue("step_type") as StepType;
              if (t === "quiz") {
                return (
                  <>
                    <Form.Item name="points" label={ru.quiz.points}>
                      <InputNumber min={0} style={{ width: 120 }} />
                    </Form.Item>
                    <Form.Item
                      name="quiz_step"
                      rules={[
                        {
                          validator: async (_, val?: QuizStepValue) => {
                            if (!val) {
                              return Promise.reject(new Error("Укажите условие и варианты ответа"));
                            }
                            const q = quizContentFromValue(val);
                            if (q.options.length < 2) {
                              return Promise.reject(
                                new Error("Добавьте минимум два варианта ответа"),
                              );
                            }
                            if (!q.correct_indices.length) {
                              return Promise.reject(
                                new Error("Отметьте хотя бы один правильный ответ"),
                              );
                            }
                            return Promise.resolve();
                          },
                        },
                      ]}
                    >
                      <QuizStepEditor />
                    </Form.Item>
                  </>
                );
              }
              if (t === "text") {
                return (
                  <Form.Item name="body_html" label="Текст">
                    <RichTextEditor minHeight={480} />
                  </Form.Item>
                );
              }
              if (t === "test_case") {
                return (
                  <>
                    <Form.Item name="points" label="Баллы">
                      <InputNumber min={0} />
                    </Form.Item>
                    <Form.Item name="condition_html" label="Условие">
                      <RichTextEditor minHeight={140} />
                    </Form.Item>
                    <Form.Item name="rubric" label="Рубрика для оценки (Фаза 2 — LLM)">
                      <Input.TextArea rows={3} />
                    </Form.Item>
                  </>
                );
              }
              return null;
            }}
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

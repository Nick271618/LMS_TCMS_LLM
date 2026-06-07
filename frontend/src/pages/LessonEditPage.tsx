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
import FreeAnswerRubricEditor from "../components/FreeAnswerRubricEditor";
import FreeAnswerScoreBandsEditor from "../components/FreeAnswerScoreBandsEditor";
import MatchStepEditor, {
  matchContentFromValue,
  matchValueFromContent,
  validateMatchContent,
  type MatchStepValue,
} from "../components/MatchStepEditor";
import QuizStepEditor, {
  quizContentFromValue,
  quizValueFromContent,
  type QuizStepValue,
} from "../components/QuizStepEditor";
import TestCaseRubricEditor from "../components/TestCaseRubricEditor";
import RichTextEditor from "../components/RichTextEditor";
import {
  defaultFreeAnswerRubric,
  freeAnswerRubricFromContent,
  freeAnswerRubricToContent,
  type FreeAnswerRubric,
} from "../lib/freeAnswerRubric";
import {
  defaultScoreBands,
  maxPointsFromBands,
  scoreBandsFromContent,
  scoreBandsToContent,
  validateScoreBands,
  type ScoreBand,
} from "../lib/freeAnswerScoreBands";
import {
  defaultRubric,
  rubricFromContent,
  rubricToContent,
  type ReferenceTestCase,
  type StepRubric,
} from "../lib/testCaseRubric";
import SubmissionsGrading from "../components/SubmissionsGrading";
import UiPracticePlayer from "../components/UiPracticePlayer";
import { ru } from "../i18n/ru";
import { llmApi, type StepDraft } from "../api/llm";
import { lessonsApi, stepsApi, type Step, type StepType } from "../api/courses";

const STEP_TYPES: { value: StepType; label: string }[] = [
  { value: "text", label: "Текст" },
  { value: "quiz", label: "Тест" },
  { value: "match", label: "Сопоставление" },
  { value: "free_answer", label: "Свободный ответ" },
  { value: "test_case", label: "Тест-кейс" },
];

const defaultMatchValue = (): MatchStepValue => matchValueFromContent({});

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
  if (type === "match") return matchContentFromValue(defaultMatchValue());
  if (type === "free_answer") {
    return {
      prompt_html: "<p>Дайте определение тест-кейсу.</p>",
      rubric: freeAnswerRubricToContent(defaultFreeAnswerRubric()),
      score_bands: scoreBandsToContent(defaultScoreBands()),
      reference_answer: "Тест-кейс — документ со сценариями проверки: шаги и ожидаемый результат.",
    };
  }
  return {
    condition_html: "<p>ТЗ: составьте тест-кейс</p>",
    rubric: rubricToContent(defaultRubric()),
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
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiDraft, setAiDraft] = useState<StepDraft | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiConfirming, setAiConfirming] = useState(false);

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
      rubric_step: defaultRubric(),
      reference_test_case: {},
      quiz_step: defaultQuizValue(),
      match_step: defaultMatchValue(),
      free_prompt_html: "",
      free_rubric_step: defaultFreeAnswerRubric(),
      free_score_bands: defaultScoreBands(),
      free_reference_answer: "",
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
      rubric_step: rubricFromContent(step.content as Record<string, unknown>),
      reference_test_case: (step.content.reference_test_case as ReferenceTestCase) || {},
      quiz_step:
        step.step_type === "quiz"
          ? quizValueFromContent(step.content as Record<string, unknown>)
          : defaultQuizValue(),
      match_step:
        step.step_type === "match"
          ? matchValueFromContent(step.content as Record<string, unknown>)
          : defaultMatchValue(),
      free_prompt_html: step.content.prompt_html || "",
      free_rubric_step: freeAnswerRubricFromContent(step.content as Record<string, unknown>),
      free_score_bands: scoreBandsFromContent(step.content as Record<string, unknown>),
      free_reference_answer: step.content.reference_answer || "",
    });
    setModalOpen(true);
  };

  const buildContent = (values: Record<string, unknown>, type: StepType) => {
    if (type === "text") return { body_html: values.body_html };
    if (type === "quiz") {
      return quizContentFromValue(values.quiz_step as QuizStepValue);
    }
    if (type === "match") {
      return matchContentFromValue(values.match_step as MatchStepValue);
    }
    if (type === "free_answer") {
      const rubric = values.free_rubric_step as FreeAnswerRubric;
      const bands = values.free_score_bands as ScoreBand[];
      const reference = String(values.free_reference_answer || "");
      return {
        prompt_html: values.free_prompt_html,
        rubric: freeAnswerRubricToContent(rubric),
        score_bands: scoreBandsToContent(bands),
        ...(reference.trim() ? { reference_answer: reference } : {}),
      };
    }
    const rubric = values.rubric_step as StepRubric;
    const ref = (values.reference_test_case as ReferenceTestCase) || {};
    const hasRef = Boolean(
      ref.title?.trim() ||
        ref.preconditions?.trim() ||
        ref.execution_steps?.trim() ||
        ref.expected_result?.trim(),
    );
    return {
      condition_html: values.condition_html,
      rubric: rubricToContent(rubric),
      ...(hasRef ? { reference_test_case: ref } : {}),
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
    if (step_type === "match") {
      const matchContent = matchContentFromValue(values.match_step as MatchStepValue);
      const err = validateMatchContent(matchContent);
      if (err) {
        message.error(err);
        return;
      }
    }
    if (step_type === "free_answer") {
      const promptHtml = String(values.free_prompt_html || "").trim();
      if (!promptHtml) {
        message.error(ru.freeAnswer.errorNoPrompt);
        return;
      }
      const bandsErr = validateScoreBands(values.free_score_bands as ScoreBand[]);
      if (bandsErr) {
        const errMsg = ru.freeAnswer[bandsErr as keyof typeof ru.freeAnswer];
        message.error(typeof errMsg === "string" ? errMsg : bandsErr);
        return;
      }
    }
    const content = buildContent(values, step_type);
    const freeAnswerPoints =
      step_type === "free_answer"
        ? maxPointsFromBands(scoreBandsToContent(values.free_score_bands as ScoreBand[]))
        : values.points;
    const body = {
      step_type,
      title: values.title || `Шаг ${steps.length + 1}`,
      points: step_type === "text" ? 0 : step_type === "free_answer" ? freeAnswerPoints : values.points,
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

  const generateAiDraft = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt) {
      message.error(ru.uiPractice.emptyPrompt);
      return;
    }
    setAiLoading(true);
    try {
      const draft = await llmApi.generateUiPractice({
        prompt,
        lesson_id: lessonId,
      });
      setAiDraft(draft);
    } catch (e) {
      message.error(e instanceof Error ? e.message : ru.uiPractice.generateError);
    } finally {
      setAiLoading(false);
    }
  };

  const regenerateAiDraft = async () => {
    if (!aiDraft) return;
    setAiLoading(true);
    try {
      const draft = await llmApi.regenerateDraft(aiDraft.id, aiPrompt.trim() || undefined);
      setAiDraft(draft);
    } catch (e) {
      message.error(e instanceof Error ? e.message : ru.uiPractice.generateError);
    } finally {
      setAiLoading(false);
    }
  };

  const confirmAiDraft = async () => {
    if (!aiDraft || !lessonId) return;
    setAiConfirming(true);
    try {
      await llmApi.confirmDraft(aiDraft.id, lessonId);
      message.success(ru.uiPractice.confirmed);
      setAiModalOpen(false);
      setAiDraft(null);
      setAiPrompt("");
      load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : ru.uiPractice.confirmError);
    } finally {
      setAiConfirming(false);
    }
  };

  const copyPreviewLink = () => {
    if (!aiDraft?.preview_url) return;
    const full = `${window.location.origin}${aiDraft.preview_url}`;
    void navigator.clipboard.writeText(full).then(() => message.success(ru.uiPractice.copied));
  };

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Link to="/teach">← Преподавание</Link>
      <Typography.Title level={3}>Редактор урока</Typography.Title>

      <Card
        title="Шаги"
        extra={
          <Space>
            <Button onClick={() => setAiModalOpen(true)}>{ru.uiPractice.generateButton}</Button>
            <Button type="primary" onClick={openCreate} disabled={steps.length >= 16}>
              + Добавить шаг
            </Button>
          </Space>
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
              <Tag color={s.step_type === "test_case" || s.step_type === "ui_practice" ? "blue" : "default"}>
                {i + 1}
              </Tag>
              <div>{s.title || s.step_type}</div>
              {(s.step_type === "test_case" || s.step_type === "ui_practice") && (
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
                if (t === "match" && !form.getFieldValue("match_step")) {
                  form.setFieldValue("match_step", defaultMatchValue());
                }
                if (t === "free_answer" && !form.getFieldValue("free_rubric_step")) {
                  const c = defaultContent("free_answer");
                  form.setFieldsValue({
                    free_prompt_html: c.prompt_html || "",
                    free_rubric_step: defaultFreeAnswerRubric(),
                    free_score_bands: defaultScoreBands(),
                    free_reference_answer: c.reference_answer || "",
                  });
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
              if (t === "match") {
                return (
                  <>
                    <Form.Item name="points" label={ru.match.points}>
                      <InputNumber min={0} style={{ width: 120 }} />
                    </Form.Item>
                    <Form.Item
                      name="match_step"
                      rules={[
                        {
                          validator: async (_, val?: MatchStepValue) => {
                            if (!val) {
                              return Promise.reject(new Error(ru.match.errorMinPairs));
                            }
                            const err = validateMatchContent(matchContentFromValue(val));
                            if (err) return Promise.reject(new Error(err));
                            return Promise.resolve();
                          },
                        },
                      ]}
                    >
                      <MatchStepEditor />
                    </Form.Item>
                  </>
                );
              }
              if (t === "free_answer") {
                return (
                  <>
                    <Form.Item name="free_prompt_html" label={ru.freeAnswer.promptLabel}>
                      <RichTextEditor minHeight={140} />
                    </Form.Item>
                    <Form.Item name="free_score_bands" label={ru.freeAnswer.scoreBandsLabel}>
                      <FreeAnswerScoreBandsEditor />
                    </Form.Item>
                    <Form.Item name="free_rubric_step" label={ru.freeAnswer.rubricLabel}>
                      <FreeAnswerRubricEditor />
                    </Form.Item>
                    <Form.Item
                      name="free_reference_answer"
                      label={ru.freeAnswer.referenceAnswerLabel}
                    >
                      <Input.TextArea rows={3} />
                    </Form.Item>
                  </>
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
                    <Form.Item name="rubric_step" label="Рубрика для ИИ">
                      <TestCaseRubricEditor />
                    </Form.Item>
                    <Typography.Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                      {ru.testCase.referenceTitle}
                    </Typography.Text>
                    <Form.Item name={["reference_test_case", "title"]} label={ru.testCase.fieldTitle}>
                      <Input />
                    </Form.Item>
                    <Form.Item
                      name={["reference_test_case", "preconditions"]}
                      label={ru.testCase.fieldPreconditions}
                    >
                      <Input.TextArea rows={2} />
                    </Form.Item>
                    <Form.Item
                      name={["reference_test_case", "execution_steps"]}
                      label={ru.testCase.fieldSteps}
                    >
                      <Input.TextArea rows={3} />
                    </Form.Item>
                    <Form.Item
                      name={["reference_test_case", "expected_result"]}
                      label={ru.testCase.fieldExpected}
                    >
                      <Input.TextArea rows={2} />
                    </Form.Item>
                  </>
                );
              }
              return null;
            }}
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={ru.uiPractice.generateModalTitle}
        open={aiModalOpen}
        onCancel={() => {
          setAiModalOpen(false);
          setAiDraft(null);
        }}
        footer={null}
        width={920}
        styles={{ body: { maxHeight: "calc(100vh - 200px)", overflowY: "auto" } }}
      >
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <div>
            <Typography.Text>{ru.uiPractice.promptLabel}</Typography.Text>
            <Input.TextArea
              rows={4}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder={ru.uiPractice.promptPlaceholder}
              style={{ marginTop: 8 }}
            />
          </div>
          <Space wrap>
            <Button type="primary" loading={aiLoading} onClick={generateAiDraft}>
              {ru.uiPractice.generateAction}
            </Button>
            {aiDraft && (
              <Button loading={aiLoading} onClick={regenerateAiDraft}>
                {ru.uiPractice.regenerateAction}
              </Button>
            )}
            {aiDraft && lessonId && (
              <Button type="primary" loading={aiConfirming} onClick={confirmAiDraft}>
                {ru.uiPractice.addToLesson}
              </Button>
            )}
          </Space>
          {aiLoading && !aiDraft && (
            <Typography.Text type="secondary">{ru.uiPractice.generating}</Typography.Text>
          )}
          {aiDraft && (
            <>
              {aiDraft.rationale && (
                <Typography.Paragraph type="secondary">{aiDraft.rationale}</Typography.Paragraph>
              )}
              <Space>
                <Typography.Text>{ru.uiPractice.previewLink}:</Typography.Text>
                <Typography.Link href={aiDraft.preview_url} target="_blank">
                  {aiDraft.preview_url}
                </Typography.Link>
                <Button size="small" onClick={copyPreviewLink}>
                  {ru.uiPractice.copyLink}
                </Button>
              </Space>
              <UiPracticePlayer content={aiDraft.content} title={aiDraft.title} preview />
            </>
          )}
        </Space>
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

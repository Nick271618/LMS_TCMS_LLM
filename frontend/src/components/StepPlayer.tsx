import { Alert, Button, Card, Checkbox, Radio, Space, Typography, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { stepsApi, type Step } from "../api/courses";
import { feedbackIndicesToShow } from "../lib/quizFeedback";
import RichHtmlViewer from "./RichHtmlViewer";
import TestCaseForm from "./TestCaseForm";

type Props = { step: Step };

export default function StepPlayer({ step }: Props) {
  const [selected, setSelected] = useState<number[]>([]);
  const [quizResult, setQuizResult] = useState<{ correct: boolean; score: number } | null>(null);

  useEffect(() => {
    setSelected([]);
    setQuizResult(null);
  }, [step.id]);

  const conditionHtml = String(step.content.condition_html || "");
  const bodyHtml = String(step.content.body_html || "");
  const options = (step.content.options as string[]) || [];
  const multiple = Boolean(step.content.multiple);
  const correctIndices = (step.content.correct_indices as number[]) || [];
  const optionFeedback = (step.content.option_feedback as string[]) || [];

  const feedbackBlocks = useMemo(() => {
    if (!quizResult || quizResult.correct) return [];
    const indices = feedbackIndicesToShow(selected, correctIndices);
    return indices
      .map((i) => ({
        index: i,
        label: options[i] ?? `Вариант ${i + 1}`,
        text: optionFeedback[i]?.trim() ?? "",
      }))
      .filter((b) => b.text);
  }, [quizResult, selected, correctIndices, options, optionFeedback]);

  const submitQuiz = async () => {
    try {
      const res = await stepsApi.submitQuiz(step.id, selected);
      setQuizResult(res);
      message.success(res.correct ? "Верно!" : "Неверно");
    } catch {
      message.error("Ошибка отправки");
    }
  };

  if (step.step_type === "text") {
    return (
      <Card title={step.title || "Теория"}>
        <RichHtmlViewer html={bodyHtml} />
      </Card>
    );
  }

  if (step.step_type === "quiz") {
    return (
      <Card title={step.title || "Тест"}>
        {conditionHtml && <RichHtmlViewer html={conditionHtml} />}
        <Space direction="vertical" style={{ width: "100%", marginTop: 16 }}>
          {multiple ? (
            <Checkbox.Group
              value={selected}
              onChange={(v) => setSelected(v as number[])}
              options={options.map((o, i) => ({ label: o, value: i }))}
            />
          ) : (
            <Radio.Group
              value={selected[0]}
              onChange={(e) => setSelected([e.target.value])}
              options={options.map((o, i) => ({ label: o, value: i }))}
            />
          )}
          <Button type="primary" onClick={submitQuiz}>
            Ответить
          </Button>
          {quizResult && (
            <Alert
              type={quizResult.correct ? "success" : "error"}
              message={
                quizResult.correct
                  ? `Верно! Баллы: ${quizResult.score}`
                  : "Неверный ответ"
              }
              description={
                !quizResult.correct && feedbackBlocks.length > 0 ? (
                  <Space direction="vertical" size="small" style={{ width: "100%" }}>
                    {feedbackBlocks.map((b) => (
                      <div key={b.index}>
                        <Typography.Text strong>{b.label}</Typography.Text>
                        <div style={{ marginTop: 4 }}>
                          <RichHtmlViewer html={b.text} />
                        </div>
                      </div>
                    ))}
                  </Space>
                ) : undefined
              }
            />
          )}
        </Space>
      </Card>
    );
  }

  if (step.step_type === "test_case") {
    return (
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        {conditionHtml && (
          <Card title="Условие">
            <RichHtmlViewer html={conditionHtml} />
          </Card>
        )}
        <TestCaseForm stepId={step.id} />
      </Space>
    );
  }

  return <Card>Тип шага «{step.step_type}» пока не поддерживается в прохождении</Card>;
}

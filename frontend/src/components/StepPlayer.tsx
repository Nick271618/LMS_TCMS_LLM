import { Alert, Button, Card, Checkbox, Radio, Space, message } from "antd";
import { useEffect, useState } from "react";
import { stepsApi, type Step } from "../api/courses";
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
        <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      </Card>
    );
  }

  if (step.step_type === "quiz") {
    return (
      <Card title={step.title || "Тест"}>
        {conditionHtml && <div dangerouslySetInnerHTML={{ __html: conditionHtml }} />}
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
            <div dangerouslySetInnerHTML={{ __html: conditionHtml }} />
          </Card>
        )}
        <TestCaseForm stepId={step.id} />
      </Space>
    );
  }

  return <Card>Тип шага «{step.step_type}» пока не поддерживается в прохождении</Card>;
}

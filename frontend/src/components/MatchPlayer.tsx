import { Alert, Button, Card, Select, Space, Typography, message } from "antd";
import { useMemo, useState } from "react";
import { stepsApi, type Step } from "../api/courses";
import { ru } from "../i18n/ru";
import RichHtmlViewer from "./RichHtmlViewer";
import "./match-player.css";
import type { MatchPair } from "./MatchStepEditor";

type Props = { step: Step };

function shuffleIndices(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function MatchPlayer({ step }: Props) {
  const pairs = (step.content.pairs as MatchPair[]) || [];
  const shuffleLeft = Boolean(step.content.shuffle_left);
  const conditionHtml = String(step.content.condition_html || "");

  const leftOrder = useMemo(
    () => (shuffleLeft ? shuffleIndices(pairs.length) : pairs.map((_, i) => i)),
    [step.id, pairs.length, shuffleLeft],
  );
  const rightOrder = useMemo(
    () => shuffleIndices(pairs.length),
    [step.id, pairs.length],
  );

  const [answers, setAnswers] = useState<Record<number, number | undefined>>({});
  const [result, setResult] = useState<{ correct: boolean; score: number } | null>(null);

  const rightOptions = rightOrder.map((origIdx) => ({
    value: origIdx,
    label: pairs[origIdx]?.right ?? "",
  }));

  const submit = async () => {
    const mapping: number[] = [];
    for (let leftIdx = 0; leftIdx < pairs.length; leftIdx++) {
      const chosen = answers[leftIdx];
      if (chosen === undefined) {
        message.warning(ru.match.errorIncomplete);
        return;
      }
      mapping[leftIdx] = chosen;
    }
    try {
      const res = await stepsApi.submitMatch(step.id, mapping);
      setResult(res);
      message.success(res.correct ? ru.match.correct : ru.match.incorrect);
    } catch {
      message.error(ru.match.submitError);
    }
  };

  if (pairs.length < 2) {
    return <Card>{ru.match.errorNotConfigured}</Card>;
  }

  return (
    <Card title={step.title || ru.match.title}>
      {conditionHtml && <RichHtmlViewer html={conditionHtml} />}
      <Space direction="vertical" style={{ width: "100%", marginTop: 16 }} size="middle">
        {leftOrder.map((leftIdx) => (
          <div key={leftIdx} className="match-player__row">
            <Typography.Text className="match-player__left">
              {pairs[leftIdx]?.left}
            </Typography.Text>
            <Select
              style={{ minWidth: 200, flex: 1 }}
              placeholder={ru.match.selectPlaceholder}
              value={answers[leftIdx]}
              onChange={(v) => setAnswers((prev) => ({ ...prev, [leftIdx]: v }))}
              options={rightOptions}
              disabled={!!result}
            />
          </div>
        ))}
        {!result && (
          <Button type="primary" onClick={submit}>
            {ru.match.submit}
          </Button>
        )}
        {result && (
          <Alert
            type={result.correct ? "success" : "error"}
            message={
              result.correct
                ? `${ru.match.correct}! ${ru.match.scoreLabel}: ${result.score}`
                : ru.match.incorrect
            }
          />
        )}
      </Space>
    </Card>
  );
}

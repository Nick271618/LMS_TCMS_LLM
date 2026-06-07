import { Checkbox, Collapse, Input, InputNumber, Space, Typography } from "antd";
import { ru } from "../i18n/ru";
import {
  FREE_ANSWER_CATALOG,
  type FreeAnswerCriterion,
  type FreeAnswerRubric,
} from "../lib/freeAnswerRubric";

type Props = {
  value?: FreeAnswerRubric;
  onChange?: (v: FreeAnswerRubric) => void;
};

const labels: Record<string, string> = ru.freeAnswer.criterionLabels;

export default function FreeAnswerRubricEditor({ value, onChange }: Props) {
  const rubric = value ?? { criteria: [], pass_percent: 60, free_text: "" };

  const update = (patch: Partial<FreeAnswerRubric>) => {
    onChange?.({ ...rubric, ...patch });
  };

  const updateCriterion = (id: string, patch: Partial<FreeAnswerCriterion>) => {
    const criteria = rubric.criteria.map((c) => (c.id === id ? { ...c, ...patch } : c));
    update({ criteria });
  };

  const items = FREE_ANSWER_CATALOG.map((cat) => {
    const c =
      rubric.criteria.find((x) => x.id === cat.id) ?? ({
        id: cat.id,
        enabled: true,
        weight: cat.defaultWeight,
        hint: "",
      } as FreeAnswerCriterion);
    return {
      key: cat.id,
      label: (
        <Space>
          <Checkbox
            checked={c.enabled}
            onChange={(e) => updateCriterion(cat.id, { enabled: e.target.checked })}
            onClick={(e) => e.stopPropagation()}
          />
          <span>{labels[cat.id] ?? cat.id}</span>
          <Typography.Text type="secondary">({c.weight}%)</Typography.Text>
        </Space>
      ),
      children: (
        <Space direction="vertical" style={{ width: "100%" }}>
          <div>
            <Typography.Text>{ru.freeAnswer.rubricWeight}</Typography.Text>
            <InputNumber
              min={0}
              max={100}
              value={c.weight}
              disabled={!c.enabled}
              onChange={(v) => updateCriterion(cat.id, { weight: Number(v) || 0 })}
              style={{ marginLeft: 8, width: 80 }}
            />
          </div>
          <Input.TextArea
            rows={2}
            placeholder={ru.freeAnswer.rubricHintPlaceholder}
            value={c.hint}
            disabled={!c.enabled}
            onChange={(e) => updateCriterion(cat.id, { hint: e.target.value })}
          />
        </Space>
      ),
    };
  });

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="middle">
      <Typography.Text type="secondary">{ru.freeAnswer.rubricIntro}</Typography.Text>
      <Collapse items={items} />
      <div>
        <Typography.Text>{ru.freeAnswer.passPercent}</Typography.Text>
        <InputNumber
          min={0}
          max={100}
          value={rubric.pass_percent}
          onChange={(v) => update({ pass_percent: Number(v) || 60 })}
          style={{ marginLeft: 8, width: 80 }}
        />
      </div>
      <div>
        <Typography.Text>{ru.freeAnswer.rubricFreeText}</Typography.Text>
        <Input.TextArea
          rows={2}
          value={rubric.free_text}
          onChange={(e) => update({ free_text: e.target.value })}
          placeholder={ru.freeAnswer.rubricFreeTextPlaceholder}
        />
      </div>
    </Space>
  );
}


import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CloseOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { Button, Checkbox, Input, Space, Typography } from "antd";
import { useCallback } from "react";
import { ru } from "../i18n/ru";
import RichTextEditor from "./RichTextEditor";
import "./match-step-editor.css";

export type MatchPair = { left: string; right: string };

export type MatchStepValue = {
  condition_html: string;
  pairs: MatchPair[];
  /** false = не перемешивать левую колонку (чекбокс включён) */
  shuffle_left: boolean;
};

const defaultValue = (): MatchStepValue => ({
  condition_html: "<p>Соотнесите элементы из двух колонок.</p>",
  pairs: [
    { left: "Sky", right: "Blue" },
    { left: "Sun", right: "Orange" },
    { left: "Grass", right: "Green" },
  ],
  shuffle_left: false,
});

function normalize(value?: MatchStepValue): MatchStepValue {
  if (!value) return defaultValue();
  const pairs =
    value.pairs?.length >= 2
      ? value.pairs.map((p) => ({
          left: p.left ?? "",
          right: p.right ?? "",
        }))
      : defaultValue().pairs;
  return {
    condition_html: value.condition_html ?? defaultValue().condition_html,
    pairs,
    shuffle_left: Boolean(value.shuffle_left),
  };
}

type Props = {
  value?: MatchStepValue;
  onChange?: (value: MatchStepValue) => void;
};

export default function MatchStepEditor({ value, onChange }: Props) {
  const data = normalize(value);

  const patch = useCallback(
    (partial: Partial<MatchStepValue>) => {
      onChange?.(normalize({ ...data, ...partial }));
    },
    [data, onChange],
  );

  const setPair = (index: number, field: "left" | "right", text: string) => {
    const pairs = data.pairs.map((p, i) => (i === index ? { ...p, [field]: text } : p));
    patch({ pairs });
  };

  const movePair = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= data.pairs.length) return;
    const pairs = [...data.pairs];
    [pairs[index], pairs[next]] = [pairs[next], pairs[index]];
    patch({ pairs });
  };

  const removePair = (index: number) => {
    if (data.pairs.length <= 2) return;
    patch({ pairs: data.pairs.filter((_, i) => i !== index) });
  };

  const addPair = () => {
    patch({
      pairs: [...data.pairs, { left: "", right: "" }],
    });
  };

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="middle">
      <div>
        <Typography.Text strong>{ru.match.condition}</Typography.Text>
        <RichTextEditor
          value={data.condition_html}
          onChange={(html) => patch({ condition_html: html })}
          minHeight={120}
        />
      </div>

      <Typography.Text type="secondary">{ru.match.pairsHint}</Typography.Text>

      {data.pairs.map((pair, index) => (
        <div key={index} className="match-step-editor__row">
          <Input
            value={pair.left}
            onChange={(e) => setPair(index, "left", e.target.value)}
            placeholder={ru.match.leftPlaceholder}
          />
          <span className="match-step-editor__bridge" />
          <Input
            value={pair.right}
            onChange={(e) => setPair(index, "right", e.target.value)}
            placeholder={ru.match.rightPlaceholder}
          />
          <Space size={4}>
            <Button
              type="text"
              size="small"
              icon={<ArrowUpOutlined />}
              disabled={index === 0}
              onClick={() => movePair(index, -1)}
            />
            <Button
              type="text"
              size="small"
              icon={<ArrowDownOutlined />}
              disabled={index === data.pairs.length - 1}
              onClick={() => movePair(index, 1)}
            />
            <Button
              type="text"
              size="small"
              danger
              icon={<CloseOutlined />}
              disabled={data.pairs.length <= 2}
              onClick={() => removePair(index)}
            />
          </Space>
        </div>
      ))}

      <Button type="dashed" icon={<PlusOutlined />} onClick={addPair} block>
        {ru.match.addPair}
      </Button>

      <Checkbox
        checked={!data.shuffle_left}
        onChange={(e) => patch({ shuffle_left: !e.target.checked })}
      >
        {ru.match.fixLeftColumn}
      </Checkbox>
      <Typography.Text type="secondary" style={{ display: "block", marginTop: -8 }}>
        {ru.match.fixLeftColumnHint}
      </Typography.Text>
    </Space>
  );
}

export function matchContentFromValue(v: MatchStepValue): Record<string, unknown> {
  const data = normalize(v);
  return {
    condition_html: data.condition_html,
    pairs: data.pairs.map((p) => ({
      left: p.left.trim(),
      right: p.right.trim(),
    })),
    shuffle_left: data.shuffle_left,
  };
}

export function matchValueFromContent(content: Record<string, unknown>): MatchStepValue {
  const rawPairs = content.pairs;
  let pairs: MatchPair[] = defaultValue().pairs;
  if (Array.isArray(rawPairs) && rawPairs.length >= 2) {
    pairs = rawPairs.map((item) => {
      if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        return {
          left: String(o.left ?? ""),
          right: String(o.right ?? ""),
        };
      }
      return { left: "", right: "" };
    });
  }
  return normalize({
    condition_html: String(content.condition_html ?? ""),
    pairs,
    shuffle_left: Boolean(content.shuffle_left),
  });
}

export function validateMatchContent(content: Record<string, unknown>): string | null {
  const v = matchValueFromContent(content);
  if (v.pairs.length < 2) return ru.match.errorMinPairs;
  for (const p of v.pairs) {
    if (!p.left.trim() || !p.right.trim()) return ru.match.errorEmptyPair;
  }
  return null;
}

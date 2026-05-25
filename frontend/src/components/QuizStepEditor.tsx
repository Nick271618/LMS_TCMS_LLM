import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CloseOutlined,
  HolderOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { Button, Checkbox, Input, Radio, Segmented, Space, Tabs, Typography } from "antd";
import { useCallback } from "react";
import { ru } from "../i18n/ru";
import RichTextEditor from "./RichTextEditor";
import "./quiz-step-editor.css";

export type QuizStepValue = {
  condition_html: string;
  options: string[];
  correct_indices: number[];
  multiple: boolean;
  /** Объяснение для каждого варианта (по индексу) */
  option_feedback: string[];
};

function alignFeedback(options: string[], feedback?: string[]): string[] {
  const fb = [...(feedback ?? [])];
  while (fb.length < options.length) fb.push("");
  return fb.slice(0, options.length);
}

const defaultValue = (): QuizStepValue => ({
  condition_html:
    "<p>Вы можете изменить условие задания в этом поле и указать настройки ниже.</p>",
  options: ["Вариант 1", "Вариант 2"],
  correct_indices: [0],
  multiple: false,
  option_feedback: ["", ""],
});

type Props = {
  value?: QuizStepValue;
  onChange?: (value: QuizStepValue) => void;
};

function normalize(value?: QuizStepValue): QuizStepValue {
  if (!value) return defaultValue();
  const options =
    value.options?.length > 0 ? [...value.options] : ["Вариант 1", "Вариант 2"];
  let correct_indices = [...(value.correct_indices ?? [])].filter(
    (i) => i >= 0 && i < options.length,
  );
  if (!value.multiple && correct_indices.length > 1) {
    correct_indices = correct_indices.slice(0, 1);
  }
  if (correct_indices.length === 0) {
    correct_indices = [0];
  }
  return {
    condition_html: value.condition_html ?? defaultValue().condition_html,
    options,
    correct_indices,
    multiple: Boolean(value.multiple),
    option_feedback: alignFeedback(options, value.option_feedback),
  };
}

export default function QuizStepEditor({ value, onChange }: Props) {
  const data = normalize(value);

  const patch = useCallback(
    (partial: Partial<QuizStepValue>) => {
      onChange?.(normalize({ ...data, ...partial }));
    },
    [data, onChange],
  );

  const setOptionText = (index: number, text: string) => {
    const options = [...data.options];
    options[index] = text;
    patch({ options });
  };

  const setFeedback = (index: number, text: string) => {
    const option_feedback = [...data.option_feedback];
    option_feedback[index] = text;
    patch({ option_feedback });
  };

  const addOption = () => {
    patch({
      options: [...data.options, `Вариант ${data.options.length + 1}`],
      option_feedback: [...data.option_feedback, ""],
    });
  };

  const removeOption = (index: number) => {
    if (data.options.length <= 1) return;
    const options = data.options.filter((_, i) => i !== index);
    const option_feedback = data.option_feedback.filter((_, i) => i !== index);
    const correct_indices = data.correct_indices
      .filter((i) => i !== index)
      .map((i) => (i > index ? i - 1 : i));
    patch({
      options,
      option_feedback,
      correct_indices: correct_indices.length ? correct_indices : [0],
    });
  };

  const moveOption = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= data.options.length) return;
    const options = [...data.options];
    const option_feedback = [...data.option_feedback];
    [options[index], options[next]] = [options[next], options[index]];
    [option_feedback[index], option_feedback[next]] = [
      option_feedback[next],
      option_feedback[index],
    ];
    const remap = (i: number) => {
      if (i === index) return next;
      if (i === next) return index;
      return i;
    };
    const correct_indices = data.correct_indices.map(remap);
    patch({ options, option_feedback, correct_indices });
  };

  const toggleCorrect = (index: number) => {
    if (data.multiple) {
      const set = new Set(data.correct_indices);
      if (set.has(index)) {
        if (set.size > 1) set.delete(index);
      } else {
        set.add(index);
      }
      patch({ correct_indices: [...set].sort((a, b) => a - b) });
    } else {
      patch({ correct_indices: [index] });
    }
  };

  const setMultiple = (multiple: boolean) => {
    let correct_indices = data.correct_indices;
    if (!multiple && correct_indices.length > 1) {
      correct_indices = [correct_indices[0]];
    }
    patch({ multiple, correct_indices });
  };

  const renderOptionHeader = (index: number, text: string) => (
    <div className="quiz-step-editor__option-row">
      <span className="quiz-step-editor__drag" title={ru.quiz.dragHint}>
        <HolderOutlined />
      </span>
      {data.multiple ? (
        <Checkbox
          checked={data.correct_indices.includes(index)}
          onChange={() => toggleCorrect(index)}
        />
      ) : (
        <Radio
          checked={data.correct_indices.includes(index)}
          onClick={() => toggleCorrect(index)}
        />
      )}
      <Input
        value={text}
        onChange={(e) => setOptionText(index, e.target.value)}
        placeholder={ru.quiz.optionPlaceholder}
      />
      <Button
        type="text"
        size="small"
        icon={<ArrowUpOutlined />}
        disabled={index === 0}
        onClick={() => moveOption(index, -1)}
      />
      <Button
        type="text"
        size="small"
        icon={<ArrowDownOutlined />}
        disabled={index === data.options.length - 1}
        onClick={() => moveOption(index, 1)}
      />
      <Button
        type="text"
        size="small"
        danger
        icon={<CloseOutlined />}
        disabled={data.options.length <= 1}
        onClick={() => removeOption(index)}
      />
    </div>
  );

  const optionRows = (
    <>
      <Typography.Text type="secondary" className="quiz-step-editor__hint">
        {ru.quiz.optionsHint}
      </Typography.Text>
      {data.options.map((text, index) => (
        <div key={index}>{renderOptionHeader(index, text)}</div>
      ))}
      <Button type="primary" icon={<PlusOutlined />} onClick={addOption}>
        {ru.quiz.addOption}
      </Button>
    </>
  );

  const feedbackRows = (
    <>
      <Typography.Text type="secondary" className="quiz-step-editor__hint">
        {ru.quiz.feedbackHint}
      </Typography.Text>
      {data.options.map((text, index) => {
        const isCorrect = data.correct_indices.includes(index);
        return (
          <div key={index} className="quiz-step-editor__option-block">
            {renderOptionHeader(index, text)}
            <Input.TextArea
              rows={2}
              value={data.option_feedback[index] ?? ""}
              onChange={(e) => setFeedback(index, e.target.value)}
              placeholder={isCorrect ? ru.quiz.feedbackCorrect : ru.quiz.feedbackWrong}
            />
          </div>
        );
      })}
      <Button type="primary" icon={<PlusOutlined />} onClick={addOption}>
        {ru.quiz.addOption}
      </Button>
    </>
  );

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <div>
        <Typography.Text strong>{ru.quiz.condition}</Typography.Text>
        <div style={{ marginTop: 8 }}>
          <RichTextEditor
            value={data.condition_html}
            onChange={(condition_html) => patch({ condition_html })}
            minHeight={220}
          />
        </div>
      </div>

      <div className="quiz-step-editor__settings-title">{ru.quiz.settings}</div>
      <div>
        <Typography.Text>{ru.quiz.correctCountLabel}</Typography.Text>
        <div style={{ marginTop: 8 }}>
          <Segmented
            value={data.multiple ? "multiple" : "single"}
            onChange={(v) => setMultiple(v === "multiple")}
            options={[
              { label: ru.quiz.single, value: "single" },
              { label: ru.quiz.multiple, value: "multiple" },
            ]}
          />
        </div>
      </div>

      <Tabs
        items={[
          { key: "options", label: ru.quiz.tabOptions, children: optionRows },
          {
            key: "feedback",
            label: ru.quiz.tabWrongFeedback,
            children: feedbackRows,
          },
        ]}
      />
    </Space>
  );
}

export type QuizStepContent = {
  condition_html: string;
  options: string[];
  correct_indices: number[];
  multiple: boolean;
  option_feedback?: string[];
};

export function quizContentFromValue(v: QuizStepValue): QuizStepContent {
  const normalized = normalize(v);
  const options = normalized.options.map((s) => s.trim()).filter(Boolean);
  const option_feedback = alignFeedback(options, normalized.option_feedback);
  const content: QuizStepContent = {
    condition_html: normalized.condition_html,
    options,
    correct_indices: normalized.correct_indices.filter((i) => i < options.length),
    multiple: normalized.multiple,
  };
  if (option_feedback.some((s) => s.trim())) {
    content.option_feedback = option_feedback;
  }
  return content;
}

export function quizValueFromContent(content: Record<string, unknown>): QuizStepValue {
  const options = (content.options as string[]) || [];
  let option_feedback = (content.option_feedback as string[]) || [];
  if (!option_feedback.length && content.wrong_answer_html) {
    option_feedback = [String(content.wrong_answer_html)];
  }
  return normalize({
    condition_html: String(content.condition_html || ""),
    options,
    correct_indices: (content.correct_indices as number[]) || [0],
    multiple: Boolean(content.multiple),
    option_feedback: alignFeedback(options, option_feedback),
  });
}

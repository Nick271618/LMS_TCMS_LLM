import { Button, InputNumber, Space, Table, Typography } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { ru } from "../i18n/ru";
import { maxPointsFromBands, type ScoreBand } from "../lib/freeAnswerScoreBands";

type Props = {
  value?: ScoreBand[];
  onChange?: (v: ScoreBand[]) => void;
};

export default function FreeAnswerScoreBandsEditor({ value, onChange }: Props) {
  const bands = value?.length ? value : [{ min_percent: 0, points: 0 }];

  const update = (next: ScoreBand[]) => {
    onChange?.(next);
  };

  const updateRow = (index: number, patch: Partial<ScoreBand>) => {
    const next = bands.map((b, i) => (i === index ? { ...b, ...patch } : b));
    update(next);
  };

  const addRow = () => {
    const last = bands[bands.length - 1];
    update([
      ...bands,
      {
        min_percent: Math.min(100, (last?.min_percent ?? 0) + 10),
        points: (last?.points ?? 0) + 1,
      },
    ]);
  };

  const removeRow = (index: number) => {
    if (bands.length <= 2) return;
    update(bands.filter((_, i) => i !== index));
  };

  const maxPoints = maxPointsFromBands(bands);

  const columns = [
    {
      title: ru.freeAnswer.scoreBandsMinPercent,
      dataIndex: "min_percent",
      key: "min_percent",
      render: (_: unknown, __: ScoreBand, index: number) => (
        <InputNumber
          min={0}
          max={100}
          value={bands[index].min_percent}
          disabled={index === 0}
          onChange={(v) => updateRow(index, { min_percent: Number(v) || 0 })}
          style={{ width: 88 }}
        />
      ),
    },
    {
      title: ru.freeAnswer.scoreBandsPoints,
      dataIndex: "points",
      key: "points",
      render: (_: unknown, __: ScoreBand, index: number) => (
        <InputNumber
          min={0}
          value={bands[index].points}
          onChange={(v) => updateRow(index, { points: Number(v) || 0 })}
          style={{ width: 88 }}
        />
      ),
    },
    {
      key: "actions",
      width: 48,
      render: (_: unknown, __: ScoreBand, index: number) =>
        index === 0 ? null : (
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => removeRow(index)}
            aria-label={ru.freeAnswer.scoreBandsRemove}
          />
        ),
    },
  ];

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="middle">
      <Typography.Text type="secondary">{ru.freeAnswer.scoreBandsIntro}</Typography.Text>
      <Table
        size="small"
        pagination={false}
        rowKey={(_, i) => String(i)}
        dataSource={bands}
        columns={columns}
      />
      <Button type="dashed" icon={<PlusOutlined />} onClick={addRow}>
        {ru.freeAnswer.scoreBandsAdd}
      </Button>
      <Typography.Text strong>
        {ru.freeAnswer.scoreBandsMaxPoints}: {maxPoints}
      </Typography.Text>
    </Space>
  );
}

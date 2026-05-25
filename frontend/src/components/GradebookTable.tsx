import { Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { Gradebook, GradebookCell, GradebookRow } from "../api/cabinet";

type Props = {
  gradebook: Gradebook;
  showStudentColumn?: boolean;
  onCellClick?: (submissionId: string) => void;
};

function renderCell(cell: GradebookCell, onClick?: (id: string) => void) {
  if (!cell.submission_id) {
    return <Typography.Text type="secondary">—</Typography.Text>;
  }
  const scoreText =
    cell.score !== null ? `${cell.score}/${cell.max_score}` : `—/${cell.max_score}`;
  const color =
    cell.status === "submitted"
      ? "gold"
      : cell.score !== null && cell.score >= cell.max_score
        ? "green"
        : cell.score !== null && cell.score > 0
          ? "orange"
          : "default";

  const content = (
    <span style={{ cursor: onClick ? "pointer" : "default" }}>
      <Tag color={color}>{scoreText}</Tag>
      {cell.status === "submitted" && <Tag>ожидает</Tag>}
      {cell.grading_source === "llm" && <Tag color="blue">ИИ</Tag>}
    </span>
  );

  if (onClick && cell.submission_id) {
    return (
      <button
        type="button"
        onClick={() => onClick(cell.submission_id!)}
        style={{
          border: "none",
          background: "none",
          padding: 0,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        {content}
      </button>
    );
  }
  return content;
}

export default function GradebookTable({
  gradebook,
  showStudentColumn = true,
  onCellClick,
}: Props) {
  const columns: ColumnsType<GradebookRow> = [];

  if (showStudentColumn) {
    columns.push({
      title: "Студент",
      fixed: "left",
      width: 200,
      render: (_, row) => (
        <div>
          <div>{row.user_name}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {row.user_email}
          </Typography.Text>
        </div>
      ),
    });
  }

  for (const col of gradebook.columns) {
    columns.push({
      title: (
        <div style={{ maxWidth: 120, fontSize: 11, lineHeight: 1.3 }}>
          <div>{col.module_title}</div>
          <div>{col.lesson_title}</div>
          <strong>{col.step_title}</strong>
        </div>
      ),
      width: 110,
      align: "center",
      render: (_, row) => {
        const cell = row.cells.find((c) => c.step_id === col.step_id);
        return cell ? renderCell(cell, onCellClick) : "—";
      },
    });
  }

  columns.push({
    title: "Итого",
    fixed: "right",
    width: 100,
    render: (_, row) => (
      <strong>
        {row.total_score}/{row.total_max} ({row.percent}%)
      </strong>
    ),
  });

  return (
    <Table
      rowKey="user_id"
      columns={columns}
      dataSource={gradebook.rows}
      pagination={false}
      scroll={{ x: Math.max(600, gradebook.columns.length * 110 + 300) }}
      size="small"
      locale={{ emptyText: "Нет записанных студентов" }}
    />
  );
}

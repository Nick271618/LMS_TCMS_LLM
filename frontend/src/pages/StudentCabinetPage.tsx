import { Card, Col, List, Progress, Row, Select, Space, Statistic, Table, Tabs, Tag, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  cabinetApi,
  type Gradebook,
  type StudentSummary,
  type SubmissionBrief,
} from "../api/cabinet";
import GradebookTable from "../components/GradebookTable";
import SubmissionReviewDrawer from "../components/SubmissionReviewDrawer";

export default function StudentCabinetPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<StudentSummary | null>(null);
  const [courseId, setCourseId] = useState<string>();
  const [gradebook, setGradebook] = useState<Gradebook | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionBrief[]>([]);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [loadingGb, setLoadingGb] = useState(false);

  useEffect(() => {
    cabinetApi
      .studentSummary()
      .then((s) => {
        setSummary(s);
        if (s.course_progress.length && !courseId) {
          setCourseId(s.course_progress[0].course_id);
        }
      })
      .catch(() => message.error("Ошибка загрузки"));
    cabinetApi.studentSubmissions().then(setSubmissions).catch(() => {});
  }, []);

  useEffect(() => {
    if (!courseId) return;
    setLoadingGb(true);
    cabinetApi
      .studentGradebook(courseId)
      .then(setGradebook)
      .catch(() => message.error("Ошибка табеля"))
      .finally(() => setLoadingGb(false));
  }, [courseId]);

  const courseOptions =
    summary?.course_progress.map((c) => ({
      value: c.course_id,
      label: c.course_title,
    })) ?? [];

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Личный кабинет студента
      </Typography.Title>
      <Typography.Text type="secondary">
        {user?.name} ({user?.email})
      </Typography.Text>

      <Tabs
        items={[
          {
            key: "overview",
            label: "Обзор",
            children: (
              <>
                <Row gutter={16}>
                  <Col xs={12} md={6}>
                    <Card>
                      <Statistic title="Курсов" value={summary?.courses_count ?? 0} />
                    </Card>
                  </Col>
                  <Col xs={12} md={6}>
                    <Card>
                      <Statistic title="На проверке" value={summary?.pending_count ?? 0} />
                    </Card>
                  </Col>
                  <Col xs={12} md={6}>
                    <Card>
                      <Statistic
                        title="Всего баллов"
                        value={summary?.total_score ?? 0}
                        suffix={`/ ${summary?.total_max ?? 0}`}
                      />
                    </Card>
                  </Col>
                  <Col xs={12} md={6}>
                    <Card>
                      <Statistic title="Успеваемость" value={summary?.percent ?? 0} suffix="%" />
                    </Card>
                  </Col>
                </Row>
                <Card title="Прогресс по курсам" style={{ marginTop: 16 }}>
                  <List
                    dataSource={summary?.course_progress ?? []}
                    renderItem={(c) => (
                      <List.Item>
                        <div style={{ width: "100%" }}>
                          <div>{c.course_title}</div>
                          <Progress percent={c.percent} format={() => `${c.total_score}/${c.total_max}`} />
                        </div>
                      </List.Item>
                    )}
                  />
                </Card>
              </>
            ),
          },
          {
            key: "grades",
            label: "Мои баллы",
            children: (
              <>
                <Select
                  style={{ minWidth: 280, marginBottom: 16 }}
                  placeholder="Курс"
                  value={courseId}
                  onChange={setCourseId}
                  options={courseOptions}
                />
                <Card loading={loadingGb}>
                  {gradebook && (
                    <GradebookTable
                      gradebook={gradebook}
                      showStudentColumn={false}
                      onCellClick={(id) => setReviewId(id)}
                    />
                  )}
                </Card>
              </>
            ),
          },
          {
            key: "works",
            label: "Мои работы",
            children: (
              <Card>
                <Table
                  rowKey="id"
                  dataSource={submissions}
                  pagination={{ pageSize: 15 }}
                  columns={[
                    { title: "Курс", dataIndex: "course_title" },
                    { title: "Шаг", dataIndex: "step_title" },
                    { title: "Тип", dataIndex: "step_type", render: (t) => <Tag>{t}</Tag> },
                    {
                      title: "Баллы",
                      render: (_, r) =>
                        r.score !== null ? `${r.score} / ${r.max_score}` : "—",
                    },
                    {
                      title: "Статус",
                      dataIndex: "status",
                      render: (s) => (
                        <Tag color={s === "graded" ? "green" : s === "submitted" ? "gold" : "default"}>
                          {s === "graded" ? "Оценено" : s === "submitted" ? "Ожидает" : s}
                        </Tag>
                      ),
                    },
                    {
                      title: "",
                      render: (_, r) => <a onClick={() => setReviewId(r.id)}>Подробнее</a>,
                    },
                  ]}
                />
              </Card>
            ),
          },
        ]}
      />

      <SubmissionReviewDrawer
        submissionId={reviewId}
        open={!!reviewId}
        onClose={() => setReviewId(null)}
        canGrade={false}
      />
    </Space>
  );
}

import { Card, Col, List, Row, Select, Space, Statistic, Table, Tabs, Tag, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  cabinetApi,
  type Gradebook,
  type SubmissionBrief,
  type TeacherSummary,
} from "../api/cabinet";
import { coursesApi, type Course } from "../api/courses";
import GradebookTable from "../components/GradebookTable";
import SubmissionReviewDrawer from "../components/SubmissionReviewDrawer";

export default function TeacherCabinetPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState<string>();
  const [summary, setSummary] = useState<TeacherSummary | null>(null);
  const [gradebook, setGradebook] = useState<Gradebook | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionBrief[]>([]);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [loadingGb, setLoadingGb] = useState(false);

  useEffect(() => {
    coursesApi.listMine().then(setCourses).catch(() => message.error("Не удалось загрузить курсы"));
  }, []);

  const loadSummary = () => {
    cabinetApi
      .teacherSummary(courseId)
      .then(setSummary)
      .catch(() => message.error("Ошибка загрузки обзора"));
  };

  const loadGradebook = () => {
    if (!courseId) return;
    setLoadingGb(true);
    cabinetApi
      .teacherGradebook(courseId)
      .then(setGradebook)
      .catch(() => message.error("Ошибка загрузки табеля"))
      .finally(() => setLoadingGb(false));
  };

  const loadSubmissions = (status?: string) => {
    cabinetApi
      .teacherSubmissions({ course_id: courseId, status })
      .then(setSubmissions)
      .catch(() => message.error("Ошибка загрузки работ"));
  };

  useEffect(() => {
    loadSummary();
  }, [courseId]);

  useEffect(() => {
    if (courseId) loadGradebook();
  }, [courseId]);

  const courseSelector = (
    <Select
      style={{ minWidth: 280 }}
      placeholder="Выберите курс"
      allowClear
      value={courseId}
      onChange={(v) => setCourseId(v)}
      options={courses.map((c) => ({ value: c.id, label: c.title }))}
    />
  );

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Личный кабинет преподавателя
      </Typography.Title>
      <Typography.Text type="secondary">
        {user?.name} ({user?.email})
      </Typography.Text>
      {courseSelector}

      <Tabs
        onChange={(key) => {
          if (key === "queue") loadSubmissions("submitted");
        }}
        items={[
          {
            key: "overview",
            label: "Обзор",
            children: (
              <>
                <Row gutter={16}>
                  <Col xs={12} md={6}>
                    <Card>
                      <Statistic title="Записано студентов" value={summary?.enrollments_count ?? 0} />
                    </Card>
                  </Col>
                  <Col xs={12} md={6}>
                    <Card>
                      <Statistic title="Ожидают проверки" value={summary?.pending_count ?? 0} />
                    </Card>
                  </Col>
                  <Col xs={12} md={6}>
                    <Card>
                      <Statistic title="Средний балл" value={summary?.avg_percent ?? 0} suffix="%" />
                    </Card>
                  </Col>
                  <Col xs={12} md={6}>
                    <Card>
                      <Statistic title="Сдачи тестов" value={summary?.quiz_attempts_count ?? 0} />
                    </Card>
                  </Col>
                </Row>
                <Card title="Последние работы" style={{ marginTop: 16 }}>
                  <List
                    dataSource={summary?.recent_submissions ?? []}
                    locale={{ emptyText: "Нет сдач" }}
                    renderItem={(s) => (
                      <List.Item
                        actions={[
                          <a key="r" onClick={() => setReviewId(s.id)}>
                            Открыть
                          </a>,
                        ]}
                      >
                        <List.Item.Meta
                          title={`${s.user_name} — ${s.step_title}`}
                          description={`${s.course_title} / ${s.lesson_title} · ${s.status}`}
                        />
                      </List.Item>
                    )}
                  />
                </Card>
              </>
            ),
          },
          {
            key: "gradebook",
            label: "Табель успеваемости",
            children: courseId ? (
              <Card loading={loadingGb}>
                {gradebook && (
                  <GradebookTable
                    gradebook={gradebook}
                    onCellClick={(id) => setReviewId(id)}
                  />
                )}
              </Card>
            ) : (
              <Typography.Text type="secondary">Выберите курс для табеля</Typography.Text>
            ),
          },
          {
            key: "queue",
            label: "Работы на проверку",
            children: (
              <Card>
                <Table
                  rowKey="id"
                  dataSource={submissions}
                  pagination={{ pageSize: 20 }}
                  locale={{ emptyText: "Нет работ на проверке" }}
                  columns={[
                    { title: "Студент", dataIndex: "user_name" },
                    { title: "Курс", dataIndex: "course_title" },
                    { title: "Урок", dataIndex: "lesson_title" },
                    { title: "Шаг", dataIndex: "step_title" },
                    {
                      title: "Тип",
                      dataIndex: "step_type",
                      render: (t) => <Tag>{t}</Tag>,
                    },
                    {
                      title: "Статус",
                      dataIndex: "status",
                      render: (s) => <Tag color={s === "submitted" ? "gold" : "green"}>{s}</Tag>,
                    },
                    {
                      title: "",
                      render: (_, r) => (
                        <a onClick={() => setReviewId(r.id)}>Проверить</a>
                      ),
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
        canGrade
        onGraded={() => {
          loadSummary();
          if (courseId) loadGradebook();
          loadSubmissions("submitted");
        }}
      />
    </Space>
  );
}

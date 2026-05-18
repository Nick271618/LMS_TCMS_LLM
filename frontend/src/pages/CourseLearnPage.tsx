import { Button, Card, Layout, Menu, Spin, Typography, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { coursesApi, lessonsApi, type CourseStructure, type Step } from "../api/courses";
import StepPlayer from "../components/StepPlayer";

const { Sider, Content } = Layout;

export default function CourseLearnPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [search, setSearch] = useSearchParams();
  const [structure, setStructure] = useState<CourseStructure | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);

  const lessonId = search.get("lesson");
  const stepId = search.get("step");

  const flatLessons = useMemo(() => {
    if (!structure) return [];
    return structure.modules.flatMap((m) =>
      m.lessons.map((l) => ({ ...l, moduleTitle: m.title })),
    );
  }, [structure]);

  const currentStep = steps.find((s) => s.id === stepId) ?? steps[0];

  useEffect(() => {
    if (!courseId) return;
    coursesApi
      .structure(courseId)
      .then((s) => {
        setStructure(s);
        const first = s.modules[0]?.lessons[0];
        if (first && !lessonId) {
          setSearch({ lesson: first.id });
        }
      })
      .catch(() => message.error("Курс не найден"))
      .finally(() => setLoading(false));
  }, [courseId]);

  useEffect(() => {
    if (!lessonId) return;
    lessonsApi
      .steps(lessonId)
      .then((st) => {
        setSteps(st);
        if (st.length && !stepId) setSearch({ lesson: lessonId, step: st[0].id });
      })
      .catch(() => message.error("Не удалось загрузить шаги"));
  }, [lessonId]);

  const menuItems = flatLessons.map((l) => ({
    key: l.id,
    label: `${l.moduleTitle} → ${l.title}`,
  }));

  const goNext = () => {
    const idx = steps.findIndex((s) => s.id === (stepId || currentStep?.id));
    if (idx >= 0 && idx < steps.length - 1) {
      setSearch({ lesson: lessonId!, step: steps[idx + 1].id });
    }
  };

  if (loading) return <Spin style={{ display: "block", margin: "80px auto" }} />;

  return (
    <Layout style={{ background: "#fff", minHeight: "70vh" }}>
      <Sider width={280} theme="light" style={{ borderRight: "1px solid #eee" }}>
        <div style={{ padding: 16 }}>
          <Link to="/">← Моё обучение</Link>
          <Typography.Title level={5} style={{ marginTop: 12 }}>
            {structure?.title}
          </Typography.Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={lessonId ? [lessonId] : []}
          items={menuItems}
          onClick={({ key }) => setSearch({ lesson: key })}
        />
      </Sider>
      <Content style={{ padding: 24 }}>
        {steps.length > 0 && currentStep ? (
          <>
            <StepPlayer step={currentStep} />
            <Button type="primary" style={{ marginTop: 24 }} onClick={goNext}>
              Следующий шаг →
            </Button>
          </>
        ) : (
          <Card>Выберите урок слева</Card>
        )}
      </Content>
    </Layout>
  );
}

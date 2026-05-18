import {
  Button,
  Card,
  Form,
  Input,
  List,
  Space,
  Tabs,
  Typography,
  message,
} from "antd";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { coursesApi, type Course, type CourseStructure } from "../api/courses";

export default function CourseEditPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [structure, setStructure] = useState<CourseStructure | null>(null);
  const [moduleTitle, setModuleTitle] = useState("");
  const [lessonTitle, setLessonTitle] = useState<Record<string, string>>({});
  const [form] = Form.useForm();

  const load = async () => {
    if (!courseId) return;
    try {
      const [c, s] = await Promise.all([coursesApi.get(courseId), coursesApi.structure(courseId)]);
      setCourse(c);
      setStructure(s);
      form.setFieldsValue({
        title: c.title,
        short_description: c.short_description,
        about_html: c.about_html || "",
      });
    } catch {
      message.error("Не удалось загрузить курс");
    }
  };

  useEffect(() => {
    load();
  }, [courseId]);

  const saveDescription = async (values: {
    title: string;
    short_description: string;
    about_html: string;
  }) => {
    if (!courseId) return;
    try {
      await coursesApi.update(courseId, values);
      message.success("Сохранено");
      load();
    } catch {
      message.error("Ошибка сохранения");
    }
  };

  const addModule = async () => {
    if (!courseId || !moduleTitle.trim()) return;
    try {
      await coursesApi.createModule(courseId, {
        title: moduleTitle.trim(),
        order: structure?.modules.length ?? 0,
      });
      setModuleTitle("");
      message.success("Модуль добавлен");
      load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Ошибка создания модуля");
    }
  };

  const addLesson = async (moduleId: string) => {
    const title = lessonTitle[moduleId]?.trim();
    if (!title) return;
    try {
      await coursesApi.createModuleLesson(moduleId, { title });
      setLessonTitle((prev) => ({ ...prev, [moduleId]: "" }));
      message.success("Урок добавлен");
      load();
    } catch {
      message.error("Ошибка");
    }
  };

  const publish = async () => {
    if (!courseId) return;
    try {
      await coursesApi.publish(courseId);
      message.success("Курс опубликован");
      load();
    } catch {
      message.error("Ошибка публикации");
    }
  };

  if (!course) return <Card loading />;

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        {course.title}
      </Typography.Title>
      <Link to="/teach">← К списку курсов</Link>

      <Tabs
        items={[
          {
            key: "desc",
            label: "Описание",
            children: (
              <Card>
                <Form form={form} layout="vertical" onFinish={saveDescription}>
                  <Form.Item name="title" label="Название" rules={[{ required: true }]}>
                    <Input maxLength={64} />
                  </Form.Item>
                  <Form.Item name="short_description" label="Краткое описание">
                    <Input.TextArea rows={3} maxLength={512} showCount />
                  </Form.Item>
                  <Form.Item name="about_html" label="О курсе (HTML)">
                    <Input.TextArea rows={6} placeholder="<p>Описание курса</p>" />
                  </Form.Item>
                  <Button type="primary" htmlType="submit">
                    Сохранить
                  </Button>
                </Form>
              </Card>
            ),
          },
          {
            key: "content",
            label: "Содержание",
            children: (
              <Space direction="vertical" style={{ width: "100%" }}>
                <Card size="small" title="Новый модуль">
                  <Space.Compact>
                    <Input
                      placeholder="Название модуля"
                      value={moduleTitle}
                      onChange={(e) => setModuleTitle(e.target.value)}
                      onPressEnter={addModule}
                    />
                    <Button type="primary" onClick={addModule}>
                      + Модуль
                    </Button>
                  </Space.Compact>
                </Card>

                {structure?.modules.map((m) => (
                  <Card key={m.id} title={m.title} size="small">
                    <List
                      dataSource={m.lessons}
                      locale={{ emptyText: "Нет уроков" }}
                      renderItem={(l) => (
                        <List.Item
                          actions={[
                            <Link key="e" to={`/teach/lessons/${l.id}`}>
                              Редактировать урок
                            </Link>,
                          ]}
                        >
                          {l.title}
                        </List.Item>
                      )}
                    />
                    <Space.Compact style={{ marginTop: 12, width: "100%" }}>
                      <Input
                        placeholder="Название нового урока"
                        value={lessonTitle[m.id] || ""}
                        onChange={(e) =>
                          setLessonTitle((prev) => ({ ...prev, [m.id]: e.target.value }))
                        }
                        onPressEnter={() => addLesson(m.id)}
                      />
                      <Button onClick={() => addLesson(m.id)}>+ Урок</Button>
                    </Space.Compact>
                  </Card>
                ))}
              </Space>
            ),
          },
        ]}
      />

      <Space>
        {!course.is_published && (
          <Button type="primary" onClick={publish}>
            Опубликовать курс
          </Button>
        )}
        {course.is_published && (
          <Typography.Text type="success">Курс опубликован — доступен студентам</Typography.Text>
        )}
      </Space>
    </Space>
  );
}

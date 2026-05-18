import { Button, Card, Input, List, Space, Tag, Typography, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { coursesApi, type Course } from "../api/courses";

export default function TeachPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    coursesApi
      .listMine()
      .then(setCourses)
      .catch(() => message.error("Не удалось загрузить курсы"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const createCourse = async () => {
    if (!newTitle.trim()) return;
    try {
      const c = await coursesApi.create({ title: newTitle.trim() });
      message.success("Курс создан");
      setNewTitle("");
      navigate(`/teach/courses/${c.id}`);
    } catch {
      message.error("Ошибка создания курса");
    }
  };

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Преподавание
      </Typography.Title>

      <Card title="Новый курс">
        <Space.Compact style={{ width: "100%", maxWidth: 480 }}>
          <Input
            placeholder="Название курса"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onPressEnter={createCourse}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={createCourse}>
            Создать
          </Button>
        </Space.Compact>
      </Card>

      <Card title="Мои курсы">
        <List
          loading={loading}
          dataSource={courses}
          locale={{ emptyText: "Пока нет курсов" }}
          renderItem={(c) => (
            <List.Item
              actions={[
                <Link key="edit" to={`/teach/courses/${c.id}`}>
                  Редактировать
                </Link>,
              ]}
            >
              <List.Item.Meta
                title={c.title}
                description={c.short_description || "Без описания"}
              />
              <Tag color={c.is_published ? "green" : "default"}>
                {c.is_published ? "Опубликован" : "Черновик"}
              </Tag>
            </List.Item>
          )}
        />
      </Card>

      <Card title="Уроки">
        <Typography.Text type="secondary">
          Уроки создаются внутри курса (модуль → урок) или в{" "}
          <Link to="/teach">редакторе курса</Link>.
        </Typography.Text>
      </Card>
    </Space>
  );
}

import { Button, Card, Col, List, Row, Space, Tag, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { coursesApi, type Course } from "../api/courses";
import { ru } from "../i18n/ru";

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState<Course[]>([]);
  const [enrolled, setEnrolled] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [cat, enr] = await Promise.all([
          coursesApi.listCatalog(),
          coursesApi.listEnrolled(),
        ]);
        setCatalog(cat);
        setEnrolled(enr);
      } catch {
        message.error(ru.home.loadError);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const enroll = async (id: string) => {
    try {
      await coursesApi.enroll(id);
      message.success(ru.home.enrollSuccess);
      const enr = await coursesApi.listEnrolled();
      setEnrolled(enr);
    } catch (e) {
      message.error(e instanceof Error ? e.message : ru.home.enrollError);
    }
  };

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Typography.Title level={3}>{ru.home.title}</Typography.Title>
      <Typography.Text>
        {ru.home.greeting}, {user?.name}
      </Typography.Text>

      {(user?.role === "teacher" || user?.role === "admin") && (
        <Link to="/teach">
          <Button type="primary">{ru.home.teach}</Button>
        </Link>
      )}

      <Row gutter={24}>
        <Col xs={24} md={12}>
          <Card title={ru.home.myCourses} loading={loading}>
            <List
              dataSource={enrolled}
              locale={{ emptyText: ru.home.myCoursesEmpty }}
              renderItem={(c) => (
                <List.Item
                  actions={[
                    <Button key="go" type="link" onClick={() => navigate(`/learn/${c.id}`)}>
                      {ru.home.open}
                    </Button>,
                  ]}
                >
                  <List.Item.Meta title={c.title} description={c.short_description} />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title={ru.home.catalog} loading={loading}>
            <List
              dataSource={catalog}
              locale={{ emptyText: ru.home.catalogEmpty }}
              renderItem={(c) => {
                const isEnrolled = enrolled.some((e) => e.id === c.id);
                return (
                  <List.Item
                    actions={[
                      isEnrolled ? (
                        <Button type="link" onClick={() => navigate(`/learn/${c.id}`)}>
                          {ru.home.go}
                        </Button>
                      ) : (
                        <Button type="primary" size="small" onClick={() => enroll(c.id)}>
                          {ru.home.enroll}
                        </Button>
                      ),
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <>
                          {c.title}{" "}
                          {isEnrolled && <Tag color="green">{ru.home.enrolledTag}</Tag>}
                        </>
                      }
                      description={c.short_description}
                    />
                  </List.Item>
                );
              }}
            />
          </Card>
        </Col>
      </Row>
    </Space>
  );
}

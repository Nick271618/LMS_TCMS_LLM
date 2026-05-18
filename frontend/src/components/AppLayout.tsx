import { Button, Layout, Menu, Typography } from "antd";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const { Header, Content } = Layout;

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const items = [{ key: "learn", label: <Link to="/">Моё обучение</Link> }];
  if (user?.role === "teacher" || user?.role === "admin") {
    items.push({ key: "teach", label: <Link to="/teach">Преподавание</Link> });
  }

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          background: "#fff",
          borderBottom: "1px solid #eee",
        }}
      >
        <Typography.Title level={4} style={{ margin: 0, color: "#52c41a" }}>
          LMS TCMS
        </Typography.Title>
        <Menu mode="horizontal" items={items} style={{ flex: 1, border: 0 }} />
        {user && (
          <>
            <Typography.Text>{user.name}</Typography.Text>
            <Button
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              Выйти
            </Button>
          </>
        )}
      </Header>
      <Content style={{ padding: 24 }}>
        <Outlet />
      </Content>
    </Layout>
  );
}

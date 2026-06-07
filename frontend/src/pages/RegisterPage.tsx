import { Button, Card, Form, Input, Radio, Typography, message } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/client";
import { useAuth } from "../context/AuthContext";

const center: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

export default function RegisterPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values: {
    email: string;
    password: string;
    name: string;
    role: string;
  }) => {
    try {
      await authApi.register(values);
      try {
        await authApi.login(values.email, values.password);
      } catch {
        message.warning("Аккаунт создан. Войдите на странице «Вход».");
        navigate("/login");
        return;
      }
      const user = authApi.storedUser();
      if (user) setUser(user);
      message.success("Регистрация успешна");
      navigate("/");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("[500]") || msg.includes("[502]") || msg.includes("Failed to fetch")) {
        message.error(
          "Сервер недоступен. Запустите PostgreSQL, затем в папке backend: python manage.py runserver",
        );
      } else if (msg.toLowerCase().includes("email") || msg.includes("уже")) {
        message.error("Этот email уже зарегистрирован — войдите или укажите другой");
      } else {
        message.error(msg || "Ошибка регистрации");
      }
    }
  };

  return (
    <div style={center}>
      <Card title="Регистрация" style={{ width: 420 }}>
        <Form layout="vertical" onFinish={onFinish} initialValues={{ role: "student" }}>
          <Form.Item label="Email" name="email" rules={[{ required: true, type: "email" }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Имя" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Пароль" name="password" rules={[{ required: true, min: 8 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item label="Тип пользователя" name="role" rules={[{ required: true }]}>
            <Radio.Group>
              <Radio value="student">Студент</Radio>
              <Radio value="teacher">Преподаватель</Radio>
            </Radio.Group>
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            Зарегистрироваться
          </Button>
        </Form>
        <Typography.Paragraph style={{ marginTop: 16 }}>
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </Typography.Paragraph>
      </Card>
    </div>
  );
}

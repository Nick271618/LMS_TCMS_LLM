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
      await authApi.login(values.email, values.password);
      const user = authApi.storedUser();
      if (user) setUser(user);
      message.success("Регистрация успешна");
      navigate("/");
    } catch {
      message.error("Ошибка регистрации");
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

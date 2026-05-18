import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Spin } from "antd";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AppLayout from "./components/AppLayout";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import TeachPage from "./pages/TeachPage";
import CourseEditPage from "./pages/CourseEditPage";
import LessonEditPage from "./pages/LessonEditPage";
import CourseLearnPage from "./pages/CourseLearnPage";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spin style={{ display: "block", margin: "40px auto" }} />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function TeacherRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spin style={{ display: "block", margin: "40px auto" }} />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "teacher" && user.role !== "admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <AppLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<HomePage />} />
            <Route path="learn/:courseId" element={<CourseLearnPage />} />
            <Route
              path="teach"
              element={
                <TeacherRoute>
                  <TeachPage />
                </TeacherRoute>
              }
            />
            <Route
              path="teach/courses/:courseId"
              element={
                <TeacherRoute>
                  <CourseEditPage />
                </TeacherRoute>
              }
            />
            <Route
              path="teach/lessons/:lessonId"
              element={
                <TeacherRoute>
                  <LessonEditPage />
                </TeacherRoute>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

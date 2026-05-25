import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function CabinetRedirectPage() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "teacher" || user.role === "admin") {
    return <Navigate to="/cabinet/teacher" replace />;
  }
  return <Navigate to="/cabinet/student" replace />;
}

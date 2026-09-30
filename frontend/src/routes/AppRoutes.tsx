import { Navigate, Route, Routes } from "react-router-dom";
import { AuthGuard } from "../auth/AuthGuard";
import { useAuth } from "../auth/AuthContext";
import { AppShell } from "../components/shell/AppShell";
import { LoginPage } from "../pages/LoginPage";
import { PhcDashboard } from "../pages/phc/PhcDashboard";
import { DistrictDashboard } from "../pages/district/DistrictDashboard";
import { StateDashboard } from "../pages/state/StateDashboard";
import { NationalDashboard } from "../pages/national/NationalDashboard";
import type { Role } from "../types";

const ROLE_HOME: Record<Role, string> = {
  PHC: "/phc",
  DISTRICT: "/district",
  STATE: "/state",
  NATIONAL: "/national",
};

function RoleHome() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_HOME[user.role]} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<AuthGuard />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<RoleHome />} />

          <Route element={<AuthGuard allow={["PHC"]} />}>
            <Route path="/phc/*" element={<PhcDashboard />} />
          </Route>

          <Route element={<AuthGuard allow={["DISTRICT"]} />}>
            <Route path="/district/*" element={<DistrictDashboard />} />
          </Route>

          <Route element={<AuthGuard allow={["STATE"]} />}>
            <Route path="/state/*" element={<StateDashboard />} />
          </Route>

          <Route element={<AuthGuard allow={["NATIONAL"]} />}>
            <Route path="/national/*" element={<NationalDashboard />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

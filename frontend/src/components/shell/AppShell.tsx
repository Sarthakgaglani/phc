import { Outlet } from "react-router-dom";
import { RoleSwitcher } from "./RoleSwitcher";

/**
 * Minimal shell: just the dev-only role switcher (hidden for real users)
 * and an Outlet. Each dashboard owns its own header and layout — AppShell
 * deliberately adds no padding or nav so dashboards are fully in control
 * of their viewport.
 */
export function AppShell() {
  return (
    <div>
      <RoleSwitcher />
      <Outlet />
    </div>
  );
}

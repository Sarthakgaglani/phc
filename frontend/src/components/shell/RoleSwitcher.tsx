import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import type { Role } from "../../types";

const ROLES: { role: Role; label: string; landing: string }[] = [
  { role: "PHC", label: "PHC staff", landing: "/phc" },
  { role: "DISTRICT", label: "District officer", landing: "/district" },
  { role: "STATE", label: "State admin", landing: "/state" },
];

const DEMO_USERNAMES = ["demo_phc", "demo_district", "demo_state"];

/**
 * Dev-only convenience (phase0.md): logs straight into a seeded demo user
 * per role so the role-based routing can be exercised without real
 * credentials.
 *
 * Only rendered when:
 *   1. The app is running in dev mode (import.meta.env.DEV), AND
 *   2. The currently logged-in user is one of the 3 seeded demo accounts.
 *
 * Real users with their own credentials never see this bar, even in dev.
 * The backend endpoint it calls (`/auth/dev-login/`) 404s when DEBUG is off.
 */
export function RoleSwitcher() {
  const { devLogin, user } = useAuth();
  const navigate = useNavigate();

  // Hide for real (non-demo) users even in dev mode
  if (!import.meta.env.DEV) return null;
  if (!user || !DEMO_USERNAMES.includes(user.username)) return null;

  async function handleSwitch(role: Role, landing: string) {
    await devLogin(role);
    navigate(landing);
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
        padding: "var(--space-3) var(--space-4)",
        backgroundColor: "var(--color-surface-container)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-bold)", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: 4 }}>
          <span className="material-symbols-outlined" style={{ fontSize: "14px", color: "var(--risk-medium-text)" }}>
            terminal
          </span>
          Dev Demo Quick Switcher
        </span>
        <span style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)" }}>Instant Role Auth</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-2)" }}>
        {ROLES.map(({ role, label, landing }) => (
          <button
            key={role}
            onClick={() => handleSwitch(role, landing)}
            style={{
              height: 34,
              borderRadius: "var(--radius-sm)",
              backgroundColor: "#ffffff",
              border: "1px solid var(--color-border-strong)",
              color: "var(--color-primary)",
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-semibold)",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

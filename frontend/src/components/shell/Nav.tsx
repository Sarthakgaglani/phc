import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

export function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "var(--space-2) var(--space-4)",
        borderBottom: "1px solid var(--color-border)",
        background: "#ffffff",
        position: "sticky",
        top: 0,
        zIndex: 40,
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        <span style={{ fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-bold)", color: "var(--color-primary)", letterSpacing: "-0.02em" }}>
          ProjectH
        </span>
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            fontWeight: "var(--font-weight-semibold)",
            padding: "2px 6px",
            borderRadius: "var(--radius-sm)",
            backgroundColor: "var(--color-surface-high)",
            color: "var(--color-text-secondary)",
            textTransform: "uppercase",
          }}
        >
          Clinical Grid
        </span>
      </div>

      {user && (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                backgroundColor: "var(--color-primary)",
                color: "var(--color-primary-contrast)",
                fontWeight: "var(--font-weight-bold)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "var(--font-size-xs)",
              }}
            >
              {user.username.substring(0, 2).toUpperCase()}
            </div>
            <div style={{ fontSize: "var(--font-size-xs)", textAlign: "left" }}>
              <div style={{ fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-primary)" }}>{user.username}</div>
              <div style={{ color: "var(--color-text-secondary)" }}>Role: {user.role}</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              height: 32,
              padding: "0 12px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "var(--color-surface-container)",
              border: "1px solid var(--color-border-strong)",
              color: "var(--color-primary)",
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-semibold)",
              cursor: "pointer",
            }}
          >
            Log Out
          </button>
        </div>
      )}
    </header>
  );
}

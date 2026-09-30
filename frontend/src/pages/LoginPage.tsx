import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/client";
import { RoleSwitcher } from "../components/shell/RoleSwitcher";

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed — verify credentials.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--color-bg)",
        backgroundImage: "radial-gradient(circle at 50% 20%, #ffffff 0%, var(--color-bg) 70%)",
        padding: "var(--space-4)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {/* Brand Header */}
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
            <span style={{ fontSize: "var(--font-size-2xl)", fontWeight: "var(--font-weight-bold)", color: "var(--color-primary)", letterSpacing: "-0.02em" }}>
              ProjectH
            </span>
            <span
              style={{
                fontSize: "var(--font-size-xs)",
                fontWeight: "var(--font-weight-semibold)",
                padding: "2px 8px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--color-primary-container)",
                color: "var(--color-primary-contrast)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Clinical Grid
            </span>
          </div>
          <p style={{ margin: 0, fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
            Public Health Clinical & Supply Operations Portal
          </p>
        </div>

        {/* Login Form Card */}
        <div className="stitch-card" style={{ padding: "var(--space-5)" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div>
              <label
                htmlFor="username"
                style={{
                  display: "block",
                  fontSize: "var(--font-size-xs)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--color-text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginBottom: "var(--space-1)",
                }}
              >
                Username
              </label>
              <div style={{ position: "relative" }}>
                <span
                  className="material-symbols-outlined"
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--color-text-muted)",
                    fontSize: "18px",
                  }}
                >
                  person
                </span>
                <input
                  id="username"
                  style={{
                    width: "100%",
                    height: 42,
                    paddingLeft: 38,
                    paddingRight: 12,
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-border-strong)",
                    backgroundColor: "#ffffff",
                    fontSize: "var(--font-size-sm)",
                    outline: "none",
                    transition: "border-color 0.15s ease",
                  }}
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                style={{
                  display: "block",
                  fontSize: "var(--font-size-xs)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--color-text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginBottom: "var(--space-1)",
                }}
              >
                Password
              </label>
              <div style={{ position: "relative" }}>
                <span
                  className="material-symbols-outlined"
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--color-text-muted)",
                    fontSize: "18px",
                  }}
                >
                  lock
                </span>
                <input
                  id="password"
                  type="password"
                  style={{
                    width: "100%",
                    height: 42,
                    paddingLeft: 38,
                    paddingRight: 12,
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-border-strong)",
                    backgroundColor: "#ffffff",
                    fontSize: "var(--font-size-sm)",
                    outline: "none",
                    transition: "border-color 0.15s ease",
                  }}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  padding: "var(--space-2) var(--space-3)",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--risk-critical-bg)",
                  border: "1px solid var(--risk-critical-border)",
                  color: "var(--risk-critical-text)",
                  fontSize: "var(--font-size-xs)",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                  error
                </span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                height: 42,
                width: "100%",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--color-primary)",
                color: "var(--color-primary-contrast)",
                fontSize: "var(--font-size-sm)",
                fontWeight: "var(--font-weight-bold)",
                border: "none",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                opacity: isSubmitting ? 0.8 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "var(--space-2)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <span>{isSubmitting ? "Authenticating…" : "Log In"}</span>
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                arrow_forward
              </span>
            </button>
          </form>
        </div>

        {/* Dev Role Quick Switcher */}
        <RoleSwitcher />
      </div>
    </div>
  );
}

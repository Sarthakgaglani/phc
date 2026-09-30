import { useState } from "react";
import { createUser, type UserAccount } from "../../api/accounts";
import type { DistrictRow } from "../../api/locations";
import type { Phc } from "../../api/phcs";

interface UserOnboardingModalProps {
  districts: DistrictRow[];
  phcs: Phc[];
  onClose: () => void;
  onSaved: (user: UserAccount) => void;
}

export function UserOnboardingModal({ districts, phcs, onClose, onSaved }: UserOnboardingModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"PHC" | "DISTRICT" | "STATE">("PHC");
  const [districtId, setDistrictId] = useState<number>(districts[0]?.id || 0);
  const [phcId, setPhcId] = useState<number>(phcs[0]?.id || 0);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredPhcs = phcs.filter((p) => p.district === districtId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Username and Password are required.");
      return;
    }
    if (role === "PHC" && !phcId) {
      setError("Please select a target PHC facility.");
      return;
    }
    if (role === "DISTRICT" && !districtId) {
      setError("Please select a target District.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const newUser = await createUser({
        username: username.trim(),
        password: password.trim(),
        role,
        district: role === "DISTRICT" ? districtId : undefined,
        phc: role === "PHC" ? phcId : undefined,
        email: email.trim() || undefined,
      });
      onSaved(newUser);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to onboard user.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "var(--space-4)",
      }}
    >
      <div
        className="stitch-card"
        style={{
          width: "100%",
          maxWidth: "520px",
          backgroundColor: "#ffffff",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <span className="material-symbols-outlined" style={{ color: "var(--color-primary)" }}>
              person_add
            </span>
            <h3 style={{ margin: 0, fontSize: "var(--font-size-base)", fontWeight: 700 }}>
              Onboard New Staff User Account
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: "none", background: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {error && (
          <div style={{ padding: "var(--space-3)", backgroundColor: "var(--risk-critical-bg)", color: "var(--risk-critical-text)", borderRadius: "var(--radius-sm)", marginBottom: "var(--space-3)", fontSize: "var(--font-size-xs)" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
            <div>
              <label style={{ display: "block", fontSize: "var(--font-size-xs)", fontWeight: 600, marginBottom: 4 }}>
                Username *
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. officer_baheri"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "var(--font-size-sm)",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "var(--font-size-xs)", fontWeight: 600, marginBottom: 4 }}>
                Initial Password *
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "var(--font-size-sm)",
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "var(--font-size-xs)", fontWeight: 600, marginBottom: 4 }}>
              Account Scope Role *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "PHC" | "DISTRICT" | "STATE")}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--font-size-sm)",
              }}
            >
              <option value="PHC">PHC Staff User (Clinic Level)</option>
              <option value="DISTRICT">District Officer (District Level)</option>
              <option value="STATE">State Health Administrator</option>
            </select>
          </div>

          {role !== "STATE" && (
            <div>
              <label style={{ display: "block", fontSize: "var(--font-size-xs)", fontWeight: 600, marginBottom: 4 }}>
                Assigned District *
              </label>
              <select
                value={districtId}
                onChange={(e) => {
                  const dId = Number(e.target.value);
                  setDistrictId(dId);
                  const firstMatching = phcs.find((p) => p.district === dId);
                  if (firstMatching) setPhcId(firstMatching.id);
                }}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "var(--font-size-sm)",
                }}
              >
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {role === "PHC" && (
            <div>
              <label style={{ display: "block", fontSize: "var(--font-size-xs)", fontWeight: 600, marginBottom: 4 }}>
                Assigned PHC Facility *
              </label>
              <select
                value={phcId}
                onChange={(e) => setPhcId(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "var(--font-size-sm)",
                }}
              >
                {filteredPhcs.length === 0 ? (
                  <option value={0}>No PHCs in selected district</option>
                ) : (
                  filteredPhcs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          <div>
            <label style={{ display: "block", fontSize: "var(--font-size-xs)", fontWeight: 600, marginBottom: 4 }}>
              Officer Email Address (Optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="officer@health.up.gov.in"
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--font-size-sm)",
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
            <button
              type="button"
              onClick={onClose}
              className="stitch-button-secondary"
              style={{ padding: "8px 16px", fontSize: "var(--font-size-xs)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="stitch-button-primary"
              style={{ padding: "8px 16px", fontSize: "var(--font-size-xs)" }}
            >
              {isSubmitting ? "Onboarding…" : "Onboard Staff User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

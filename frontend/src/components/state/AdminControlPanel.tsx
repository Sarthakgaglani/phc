import { useState } from "react";
import type { Phc } from "../../api/phcs";
import type { DistrictRow } from "../../api/locations";
import type { UserAccount } from "../../api/accounts";
import { PhcManagementModal } from "./PhcManagementModal";
import { DistrictManagementModal } from "./DistrictManagementModal";
import { UserOnboardingModal } from "./UserOnboardingModal";
import { updatePhc } from "../../api/phcs";
import { updateUser } from "../../api/accounts";

interface AdminControlPanelProps {
  phcs: Phc[];
  districts: DistrictRow[];
  users: UserAccount[];
  onPhcsUpdated: () => void;
  onDistrictsUpdated: () => void;
  onUsersUpdated: () => void;
}

export function AdminControlPanel({
  phcs,
  districts,
  users,
  onPhcsUpdated,
  onDistrictsUpdated,
  onUsersUpdated,
}: AdminControlPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<"phcs" | "districts" | "users">("phcs");
  const [phcSearch, setPhcSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");

  const [editingPhc, setEditingPhc] = useState<Phc | null>(null);
  const [isPhcModalOpen, setIsPhcModalOpen] = useState(false);
  const [isDistrictModalOpen, setIsDistrictModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  const filteredPhcs = phcs.filter(
    (p) =>
      p.name.toLowerCase().includes(phcSearch.toLowerCase()) ||
      p.code.toLowerCase().includes(phcSearch.toLowerCase()) ||
      p.district_name.toLowerCase().includes(phcSearch.toLowerCase())
  );

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.role.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.phc_name && u.phc_name.toLowerCase().includes(userSearch.toLowerCase())) ||
      (u.district_name && u.district_name.toLowerCase().includes(userSearch.toLowerCase()))
  );

  async function handleTogglePhcActive(phc: Phc) {
    try {
      await updatePhc(phc.id, { is_active: !phc.is_active });
      onPhcsUpdated();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to toggle status.");
    }
  }

  async function handleToggleUserActive(user: UserAccount) {
    try {
      await updateUser(user.id, { is_active: !user.is_active });
      onUsersUpdated();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to toggle user status.");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {/* Sub-navigation bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-border)", paddingBottom: "var(--space-3)" }}>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <button
            type="button"
            onClick={() => setActiveSubTab("phcs")}
            style={{
              padding: "8px 16px",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--font-size-xs)",
              fontWeight: 600,
              cursor: "pointer",
              border: "1px solid",
              borderColor: activeSubTab === "phcs" ? "var(--color-primary)" : "var(--color-border)",
              backgroundColor: activeSubTab === "phcs" ? "var(--color-primary)" : "#ffffff",
              color: activeSubTab === "phcs" ? "#ffffff" : "var(--color-text-main)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>local_hospital</span>
            Primary Health Centers ({phcs.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("districts")}
            style={{
              padding: "8px 16px",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--font-size-xs)",
              fontWeight: 600,
              cursor: "pointer",
              border: "1px solid",
              borderColor: activeSubTab === "districts" ? "var(--color-primary)" : "var(--color-border)",
              backgroundColor: activeSubTab === "districts" ? "var(--color-primary)" : "#ffffff",
              color: activeSubTab === "districts" ? "#ffffff" : "var(--color-text-main)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>domain</span>
            Districts ({districts.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("users")}
            style={{
              padding: "8px 16px",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--font-size-xs)",
              fontWeight: 600,
              cursor: "pointer",
              border: "1px solid",
              borderColor: activeSubTab === "users" ? "var(--color-primary)" : "var(--color-border)",
              backgroundColor: activeSubTab === "users" ? "var(--color-primary)" : "#ffffff",
              color: activeSubTab === "users" ? "#ffffff" : "var(--color-text-main)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>group</span>
            Staff User Accounts ({users.length})
          </button>
        </div>

        <div>
          {activeSubTab === "phcs" && (
            <button
              type="button"
              onClick={() => {
                setEditingPhc(null);
                setIsPhcModalOpen(true);
              }}
              className="stitch-button-primary"
              style={{ padding: "8px 16px", fontSize: "var(--font-size-xs)", display: "flex", alignItems: "center", gap: 6 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
              Register New PHC
            </button>
          )}

          {activeSubTab === "districts" && (
            <button
              type="button"
              onClick={() => setIsDistrictModalOpen(true)}
              className="stitch-button-primary"
              style={{ padding: "8px 16px", fontSize: "var(--font-size-xs)", display: "flex", alignItems: "center", gap: 6 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
              Create New District
            </button>
          )}

          {activeSubTab === "users" && (
            <button
              type="button"
              onClick={() => setIsUserModalOpen(true)}
              className="stitch-button-primary"
              style={{ padding: "8px 16px", fontSize: "var(--font-size-xs)", display: "flex", alignItems: "center", gap: 6 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_add</span>
              Onboard Staff Account
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: PHCs Management */}
      {activeSubTab === "phcs" && (
        <div className="stitch-card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: "var(--font-size-base)", fontWeight: 700, margin: 0 }}>
              Primary Health Centers Directory & Operations
            </h2>
            <input
              type="text"
              value={phcSearch}
              onChange={(e) => setPhcSearch(e.target.value)}
              placeholder="Search PHC name, code, district…"
              style={{
                padding: "6px 12px",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--font-size-xs)",
                width: "260px",
              }}
            />
          </div>

          <table className="stitch-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>PHC Facility Name</th>
                <th>District</th>
                <th>Address</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPhcs.map((phc) => (
                <tr key={phc.id}>
                  <td style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "11px" }}>{phc.code}</td>
                  <td style={{ fontWeight: 600 }}>{phc.name}</td>
                  <td>{phc.district_name}</td>
                  <td style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-xs)" }}>
                    {phc.address || "—"}
                  </td>
                  <td>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: 600,
                        backgroundColor: phc.is_active ? "var(--risk-safe-bg)" : "var(--color-surface-low)",
                        color: phc.is_active ? "var(--risk-safe-text)" : "var(--color-text-secondary)",
                      }}
                    >
                      {phc.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPhc(phc);
                          setIsPhcModalOpen(true);
                        }}
                        style={{ border: "none", background: "none", cursor: "pointer", color: "var(--color-primary)", padding: 4 }}
                        title="Edit PHC"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTogglePhcActive(phc)}
                        style={{ border: "none", background: "none", cursor: "pointer", color: phc.is_active ? "var(--risk-critical-text)" : "var(--risk-safe-text)", padding: 4 }}
                        title={phc.is_active ? "Deactivate PHC" : "Activate PHC"}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                          {phc.is_active ? "toggle_on" : "toggle_off"}
                        </span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPhcs.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "var(--color-text-secondary)", padding: "var(--space-4)" }}>
                    No matching PHCs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: Districts Management */}
      {activeSubTab === "districts" && (
        <div className="stitch-card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <h2 style={{ fontSize: "var(--font-size-base)", fontWeight: 700, margin: 0 }}>
            Health Districts Directory ({districts.length})
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "var(--space-3)" }}>
            {districts.map((district) => {
              const districtPhcs = phcs.filter((p) => p.district === district.id);
              return (
                <div
                  key={district.id}
                  style={{
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    padding: "var(--space-3)",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "var(--font-size-sm)" }}>{district.name}</div>
                      <div style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>
                        Code: <strong style={{ fontFamily: "monospace" }}>{district.code}</strong> · State: {district.state_name}
                      </div>
                    </div>
                    <span className="material-symbols-outlined" style={{ color: "var(--color-primary)", fontSize: 20 }}>
                      domain
                    </span>
                  </div>

                  <div style={{ borderTop: "1px solid var(--color-border-subtle)", paddingTop: 8, marginTop: 8, display: "flex", justifyContent: "space-between", fontSize: "var(--font-size-xs)" }}>
                    <span style={{ color: "var(--color-text-secondary)" }}>Total Facility PHCs</span>
                    <strong style={{ color: "var(--color-primary)" }}>{districtPhcs.length} PHCs</strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: Staff User Accounts */}
      {activeSubTab === "users" && (
        <div className="stitch-card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: "var(--font-size-base)", fontWeight: 700, margin: 0 }}>
              State & Facility Staff Accounts ({users.length})
            </h2>
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search username, role, facility…"
              style={{
                padding: "6px 12px",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--font-size-xs)",
                width: "260px",
              }}
            />
          </div>

          <table className="stitch-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Role Scope</th>
                <th>Assigned Location / Facility</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.username}</td>
                  <td>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: 700,
                        backgroundColor:
                          u.role === "STATE"
                            ? "rgba(37, 99, 235, 0.1)"
                            : u.role === "DISTRICT"
                            ? "rgba(124, 58, 237, 0.1)"
                            : "rgba(16, 185, 129, 0.1)",
                        color:
                          u.role === "STATE"
                            ? "var(--color-primary)"
                            : u.role === "DISTRICT"
                            ? "#7c3aed"
                            : "#059669",
                      }}
                    >
                      {u.role === "STATE" ? "State Admin" : u.role === "DISTRICT" ? "District Officer" : "PHC Staff"}
                    </span>
                  </td>
                  <td style={{ fontSize: "var(--font-size-xs)" }}>
                    {u.phc_name
                      ? `PHC: ${u.phc_name}`
                      : u.district_name
                      ? `District: ${u.district_name}`
                      : u.state_name
                      ? `State: ${u.state_name}`
                      : "Statewide"}
                  </td>
                  <td>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: 600,
                        backgroundColor: u.is_active ? "var(--risk-safe-bg)" : "var(--color-surface-low)",
                        color: u.is_active ? "var(--risk-safe-text)" : "var(--color-text-secondary)",
                      }}
                    >
                      {u.is_active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      onClick={() => handleToggleUserActive(u)}
                      style={{ border: "none", background: "none", cursor: "pointer", color: u.is_active ? "var(--risk-critical-text)" : "var(--risk-safe-text)", padding: 4 }}
                      title={u.is_active ? "Disable Account" : "Enable Account"}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                        {u.is_active ? "toggle_on" : "toggle_off"}
                      </span>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "var(--color-text-secondary)", padding: "var(--space-4)" }}>
                    No matching staff user accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {isPhcModalOpen && (
        <PhcManagementModal
          phc={editingPhc}
          districts={districts}
          onClose={() => {
            setIsPhcModalOpen(false);
            setEditingPhc(null);
          }}
          onSaved={() => onPhcsUpdated()}
        />
      )}

      {isDistrictModalOpen && (
        <DistrictManagementModal
          onClose={() => setIsDistrictModalOpen(false)}
          onSaved={() => onDistrictsUpdated()}
        />
      )}

      {isUserModalOpen && (
        <UserOnboardingModal
          districts={districts}
          phcs={phcs}
          onClose={() => setIsUserModalOpen(false)}
          onSaved={() => onUsersUpdated()}
        />
      )}
    </div>
  );
}

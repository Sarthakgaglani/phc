import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { getStates, createState, getDistricts, createDistrict, type StateRow, type DistrictRow } from "../../api/locations";
import { getPhcs, createPhc, updatePhc, type Phc } from "../../api/phcs";
import { getUsers, createUser, updateUser, type UserAccount } from "../../api/accounts";

// ─── helpers ──────────────────────────────────────────────────────────────────

type Tab = "states" | "districts" | "phcs" | "users";

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "states",    label: "States",    icon: "public" },
    { id: "districts", label: "Districts", icon: "domain" },
    { id: "phcs",      label: "PHCs",      icon: "local_hospital" },
    { id: "users",     label: "Users",     icon: "group" },
  ];
  return (
    <div style={{ display: "flex", borderBottom: "2px solid var(--color-border)", background: "#fff" }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          style={{
            height: 44, padding: "0 22px", border: "none",
            borderBottom: active === t.id ? "2px solid var(--color-primary)" : "2px solid transparent",
            marginBottom: -2, background: "transparent", cursor: "pointer",
            fontWeight: active === t.id ? 700 : 400,
            fontSize: "var(--font-size-sm)",
            color: active === t.id ? "var(--color-primary)" : "var(--color-text-secondary)",
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{t.icon}</span>
          {t.label}
        </button>
      ))}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px",
  border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)",
  fontSize: "var(--font-size-sm)", background: "#fff",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "var(--font-size-xs)", fontWeight: 600,
  marginBottom: 4, color: "var(--color-text-secondary)", textTransform: "uppercase",
};
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label style={labelStyle}>{label}</label>{children}</div>;
}

// ─── inline modal shell ───────────────────────────────────────────────────────

function Modal({ title, icon, onClose, children }: {
  title: string; icon: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
      <div className="stitch-card" style={{ width: "100%", maxWidth: 520, background: "#fff", boxShadow: "0 20px 25px -5px rgba(0,0,0,.1)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="material-symbols-outlined" style={{ color: "var(--color-primary)" }}>{icon}</span>
            <h3 style={{ margin: 0, fontSize: "var(--font-size-base)", fontWeight: 700 }}>{title}</h3>
          </div>
          <button type="button" onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return <div style={{ padding: "10px 12px", background: "var(--risk-critical-bg)", color: "var(--risk-critical-text)", borderRadius: "var(--radius-sm)", marginBottom: 12, fontSize: "var(--font-size-xs)" }}>{msg}</div>;
}

function ActionRow({ onClose, busy, label }: { onClose: () => void; busy: boolean; label: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
      <button type="button" onClick={onClose} style={{ height: 36, padding: "0 16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border-strong)", background: "#fff", cursor: "pointer", fontSize: "var(--font-size-sm)" }}>Cancel</button>
      <button type="submit" disabled={busy} style={{ height: 36, padding: "0 20px", borderRadius: "var(--radius-sm)", background: "var(--color-primary)", color: "#fff", border: "none", fontWeight: 700, fontSize: "var(--font-size-sm)", cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1 }}>
        {busy ? "Saving…" : label}
      </button>
    </div>
  );
}

// ─── States tab ───────────────────────────────────────────────────────────────

function AddStateModal({ onClose, onSaved }: { onClose: () => void; onSaved: (s: StateRow) => void }) {
  const [name, setName] = useState(""); const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !code.trim()) { setErr("Name and Code are required."); return; }
    setBusy(true); setErr(null);
    try { onSaved(await createState({ name: name.trim(), code: code.trim().toUpperCase() })); onClose(); }
    catch { setErr("Failed to create state. Code must be unique."); }
    finally { setBusy(false); }
  }
  return (
    <Modal title="Add New State" icon="public" onClose={onClose}>
      {err && <ErrorBox msg={err} />}
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="State Name *"><input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Gujarat" required /></Field>
        <Field label="State Code *"><input style={{ ...inputStyle, fontFamily: "monospace", textTransform: "uppercase" }} value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. GJ-SYNTH" required /></Field>
        <ActionRow onClose={onClose} busy={busy} label="Create State" />
      </form>
    </Modal>
  );
}

function StatesTab({ states, districts, phcs, onRefresh }: { states: StateRow[]; districts: DistrictRow[]; phcs: Phc[]; onRefresh: () => void }) {
  const [showModal, setShowModal] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: "var(--font-size-base)", fontWeight: 700 }}>All States ({states.length})</h2>
        <button type="button" onClick={() => setShowModal(true)} style={{ height: 36, padding: "0 16px", borderRadius: "var(--radius-sm)", background: "var(--color-primary)", color: "#fff", border: "none", fontWeight: 600, fontSize: "var(--font-size-sm)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>Add State
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))", gap: 12 }}>
        {states.map(s => {
          const dCount = districts.filter(d => d.state === s.id).length;
          const pCount = phcs.filter(p => districts.find(d => d.id === p.district && d.state === s.id)).length;
          return (
            <div key={s.id} className="stitch-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "var(--font-size-sm)" }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", fontFamily: "monospace", marginTop: 2 }}>{s.code}</div>
                </div>
                <span className="material-symbols-outlined" style={{ color: "var(--color-primary)", fontSize: 22 }}>public</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, borderTop: "1px solid var(--color-border-subtle)", paddingTop: 10 }}>
                {[["Districts", dCount], ["PHCs", pCount]].map(([label, val]) => (
                  <div key={label as string} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "var(--font-size-xl)", fontWeight: 700, color: "var(--color-primary)" }} className="tabular-nums">{val}</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {showModal && <AddStateModal onClose={() => setShowModal(false)} onSaved={s => { onRefresh(); setShowModal(false); }} />}
    </div>
  );
}

// ─── Districts tab ────────────────────────────────────────────────────────────

function AddDistrictModal({ states, onClose, onSaved }: { states: StateRow[]; onClose: () => void; onSaved: (d: DistrictRow) => void }) {
  const [name, setName] = useState(""); const [code, setCode] = useState("");
  const [stateId, setStateId] = useState<number>(states[0]?.id ?? 0);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !code.trim() || !stateId) { setErr("All fields required."); return; }
    setBusy(true); setErr(null);
    try { onSaved(await createDistrict({ name: name.trim(), code: code.trim().toUpperCase(), state: stateId })); onClose(); }
    catch { setErr("Failed to create district. Code must be unique."); }
    finally { setBusy(false); }
  }
  return (
    <Modal title="Add New District" icon="domain" onClose={onClose}>
      {err && <ErrorBox msg={err} />}
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="State *">
          <select style={inputStyle} value={stateId} onChange={e => setStateId(Number(e.target.value))}>
            {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="District Name *"><input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ahmedabad" required /></Field>
        <Field label="District Code *"><input style={{ ...inputStyle, fontFamily: "monospace", textTransform: "uppercase" }} value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. GJ-D1" required /></Field>
        <ActionRow onClose={onClose} busy={busy} label="Create District" />
      </form>
    </Modal>
  );
}

function DistrictsTab({ states, districts, phcs, onRefresh }: { states: StateRow[]; districts: DistrictRow[]; phcs: Phc[]; onRefresh: () => void }) {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = districts.filter(d => d.name.toLowerCase().includes(search.toLowerCase()) || d.code.toLowerCase().includes(search.toLowerCase()) || d.state_name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: "var(--font-size-base)", fontWeight: 700 }}>All Districts ({districts.length})</h2>
        <div style={{ display: "flex", gap: 10 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search districts…" style={{ ...inputStyle, width: 220 }} />
          <button type="button" onClick={() => setShowModal(true)} style={{ height: 36, padding: "0 16px", borderRadius: "var(--radius-sm)", background: "var(--color-primary)", color: "#fff", border: "none", fontWeight: 600, fontSize: "var(--font-size-sm)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>Add District
          </button>
        </div>
      </div>
      <div className="stitch-card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "var(--color-surface-container)", fontSize: "var(--font-size-xs)", fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>
              <th style={{ padding: "10px 20px" }}>Code</th>
              <th style={{ padding: "10px 20px" }}>District</th>
              <th style={{ padding: "10px 20px" }}>State</th>
              <th style={{ padding: "10px 20px", textAlign: "right" }}>PHCs</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d, i) => (
              <tr key={d.id} style={{ background: i % 2 === 0 ? "#fff" : "#faf9f7", borderBottom: "1px solid var(--color-border-subtle)" }}>
                <td style={{ padding: "11px 20px", fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)" }}>{d.code}</td>
                <td style={{ padding: "11px 20px", fontWeight: 600, fontSize: "var(--font-size-sm)" }}>{d.name}</td>
                <td style={{ padding: "11px 20px", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>{d.state_name}</td>
                <td style={{ padding: "11px 20px", textAlign: "right", fontWeight: 700 }} className="tabular-nums">{phcs.filter(p => p.district === d.id).length}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={4} style={{ padding: 24, textAlign: "center", color: "var(--color-text-secondary)" }}>No districts found.</td></tr>}
          </tbody>
        </table>
      </div>
      {showModal && <AddDistrictModal states={states} onClose={() => setShowModal(false)} onSaved={() => { onRefresh(); setShowModal(false); }} />}
    </div>
  );
}

// ─── PHCs tab ─────────────────────────────────────────────────────────────────

function AddPhcModal({ districts, onClose, onSaved }: { districts: DistrictRow[]; onClose: () => void; onSaved: (p: Phc) => void }) {
  const [name, setName] = useState(""); const [code, setCode] = useState(""); const [address, setAddress] = useState("");
  const [districtId, setDistrictId] = useState<number>(districts[0]?.id ?? 0);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !code.trim() || !districtId) { setErr("Name, Code and District are required."); return; }
    setBusy(true); setErr(null);
    try { onSaved(await createPhc({ name: name.trim(), code: code.trim(), district: districtId, address: address.trim() })); onClose(); }
    catch { setErr("Failed to create PHC. Code must be unique."); }
    finally { setBusy(false); }
  }
  return (
    <Modal title="Register New PHC" icon="local_hospital" onClose={onClose}>
      {err && <ErrorBox msg={err} />}
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="District *">
          <select style={inputStyle} value={districtId} onChange={e => setDistrictId(Number(e.target.value))}>
            {districts.map(d => <option key={d.id} value={d.id}>{d.name} — {d.state_name}</option>)}
          </select>
        </Field>
        <Field label="PHC Name *"><input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Naroda PHC" required /></Field>
        <Field label="Unique Code *"><input style={{ ...inputStyle, fontFamily: "monospace" }} value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. GJ-D1-PHC1" required /></Field>
        <Field label="Address"><input style={inputStyle} value={address} onChange={e => setAddress(e.target.value)} placeholder="e.g. Naroda Road, Ahmedabad" /></Field>
        <ActionRow onClose={onClose} busy={busy} label="Register PHC" />
      </form>
    </Modal>
  );
}

function PhcsTab({ districts, phcs, onRefresh }: { districts: DistrictRow[]; phcs: Phc[]; onRefresh: () => void }) {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<number | "all">("all");
  const states = Array.from(new Map(districts.map(d => [d.state, d.state_name])).entries());
  const filtered = phcs.filter(p => {
    const dist = districts.find(d => d.id === p.district);
    if (stateFilter !== "all" && dist?.state !== stateFilter) return false;
    return p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase());
  });
  async function toggleActive(phc: Phc) {
    try { await updatePhc(phc.id, { is_active: !phc.is_active }); onRefresh(); }
    catch { alert("Failed to update PHC status."); }
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: "var(--font-size-base)", fontWeight: 700 }}>All PHCs ({phcs.length})</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select style={{ ...inputStyle, width: 180 }} value={stateFilter} onChange={e => setStateFilter(e.target.value === "all" ? "all" : Number(e.target.value))}>
            <option value="all">All States</option>
            {states.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search PHCs…" style={{ ...inputStyle, width: 200 }} />
          <button type="button" onClick={() => setShowModal(true)} style={{ height: 36, padding: "0 16px", borderRadius: "var(--radius-sm)", background: "var(--color-primary)", color: "#fff", border: "none", fontWeight: 600, fontSize: "var(--font-size-sm)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>Register PHC
          </button>
        </div>
      </div>
      <div className="stitch-card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "var(--color-surface-container)", fontSize: "var(--font-size-xs)", fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>
              <th style={{ padding: "10px 20px" }}>Code</th>
              <th style={{ padding: "10px 20px" }}>PHC Name</th>
              <th style={{ padding: "10px 20px" }}>District</th>
              <th style={{ padding: "10px 20px" }}>State</th>
              <th style={{ padding: "10px 20px", textAlign: "center" }}>Status</th>
              <th style={{ padding: "10px 20px", textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => {
              const dist = districts.find(d => d.id === p.district);
              return (
                <tr key={p.id} style={{ background: i % 2 === 0 ? "#fff" : "#faf9f7", borderBottom: "1px solid var(--color-border-subtle)" }}>
                  <td style={{ padding: "11px 20px", fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)" }}>{p.code}</td>
                  <td style={{ padding: "11px 20px", fontWeight: 600, fontSize: "var(--font-size-sm)" }}>{p.name}</td>
                  <td style={{ padding: "11px 20px", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>{p.district_name}</td>
                  <td style={{ padding: "11px 20px", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>{dist?.state_name ?? "—"}</td>
                  <td style={{ padding: "11px 20px", textAlign: "center" }}>
                    <span style={{ padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: p.is_active ? "var(--risk-safe-bg)" : "var(--color-surface-low)", color: p.is_active ? "var(--risk-safe-text)" : "var(--color-text-secondary)" }}>
                      {p.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ padding: "11px 20px", textAlign: "right" }}>
                    <button type="button" onClick={() => toggleActive(p)} title={p.is_active ? "Deactivate" : "Activate"} style={{ border: "none", background: "none", cursor: "pointer", color: p.is_active ? "var(--risk-critical-text)" : "var(--color-secondary)", padding: 4 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{p.is_active ? "toggle_on" : "toggle_off"}</span>
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: "var(--color-text-secondary)" }}>No PHCs found.</td></tr>}
          </tbody>
        </table>
      </div>
      {showModal && <AddPhcModal districts={districts} onClose={() => setShowModal(false)} onSaved={() => { onRefresh(); setShowModal(false); }} />}
    </div>
  );
}

// ─── Users tab ────────────────────────────────────────────────────────────────

function AddUserModal({ states, districts, phcs, onClose, onSaved }: {
  states: StateRow[]; districts: DistrictRow[]; phcs: Phc[];
  onClose: () => void; onSaved: () => void;
}) {
  const [username, setUsername] = useState(""); const [password, setPassword] = useState(""); const [email, setEmail] = useState("");
  const [role, setRole] = useState<"PHC" | "DISTRICT" | "STATE" | "NATIONAL">("PHC");
  const [stateId, setStateId] = useState<number>(states[0]?.id ?? 0);
  const [districtId, setDistrictId] = useState<number>(districts[0]?.id ?? 0);
  const [phcId, setPhcId] = useState<number>(phcs[0]?.id ?? 0);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const filteredDistricts = districts.filter(d => d.state === stateId);
  const filteredPhcs = phcs.filter(p => p.district === districtId);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { setErr("Username and password are required."); return; }
    setBusy(true); setErr(null);
    try {
      await createUser({
        username: username.trim(), password: password.trim(), role, email: email.trim() || undefined,
        state: role === "STATE" ? stateId : role === "DISTRICT" ? stateId : role === "PHC" ? stateId : undefined,
        district: role === "DISTRICT" ? districtId : role === "PHC" ? districtId : undefined,
        phc: role === "PHC" ? phcId : undefined,
      });
      onSaved(); onClose();
    } catch { setErr("Failed to create user. Username may already exist."); }
    finally { setBusy(false); }
  }
  return (
    <Modal title="Create User Account" icon="person_add" onClose={onClose}>
      {err && <ErrorBox msg={err} />}
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Username *"><input style={inputStyle} value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. phc_naroda" required /></Field>
          <Field label="Password *"><input type="password" style={inputStyle} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required /></Field>
        </div>
        <Field label="Role *">
          <select style={inputStyle} value={role} onChange={e => setRole(e.target.value as typeof role)}>
            <option value="PHC">PHC Staff</option>
            <option value="DISTRICT">District Officer</option>
            <option value="STATE">State Admin</option>
            <option value="NATIONAL">National Admin</option>
          </select>
        </Field>
        {role !== "NATIONAL" && (
          <Field label="State *">
            <select style={inputStyle} value={stateId} onChange={e => { setStateId(Number(e.target.value)); setDistrictId(filteredDistricts[0]?.id ?? 0); }}>
              {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
        )}
        {(role === "DISTRICT" || role === "PHC") && (
          <Field label="District *">
            <select style={inputStyle} value={districtId} onChange={e => setDistrictId(Number(e.target.value))}>
              {filteredDistricts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
        )}
        {role === "PHC" && (
          <Field label="PHC *">
            <select style={inputStyle} value={phcId} onChange={e => setPhcId(Number(e.target.value))}>
              {filteredPhcs.length === 0
                ? <option value={0}>No PHCs in this district</option>
                : filteredPhcs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Email (optional)"><input type="email" style={inputStyle} value={email} onChange={e => setEmail(e.target.value)} placeholder="officer@health.gov.in" /></Field>
        <ActionRow onClose={onClose} busy={busy} label="Create Account" />
      </form>
    </Modal>
  );
}

const ROLE_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  NATIONAL: { bg: "rgba(124,58,237,.12)", color: "#7c3aed", label: "National Admin" },
  STATE:    { bg: "rgba(37,99,235,.1)",   color: "var(--color-primary)", label: "State Admin" },
  DISTRICT: { bg: "rgba(124,58,237,.08)", color: "#7c3aed", label: "District Officer" },
  PHC:      { bg: "rgba(16,185,129,.1)",  color: "#059669", label: "PHC Staff" },
};

function UsersTab({ states, districts, phcs, users, onRefresh }: {
  states: StateRow[]; districts: DistrictRow[]; phcs: Phc[]; users: UserAccount[]; onRefresh: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const filtered = users.filter(u => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    return u.username.toLowerCase().includes(search.toLowerCase()) ||
      (u.phc_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (u.district_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (u.state_name ?? "").toLowerCase().includes(search.toLowerCase());
  });
  async function toggleActive(u: UserAccount) {
    try { await updateUser(u.id, { is_active: !u.is_active }); onRefresh(); }
    catch { alert("Failed to update user."); }
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: "var(--font-size-base)", fontWeight: 700 }}>All Users ({users.length})</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select style={{ ...inputStyle, width: 160 }} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="all">All Roles</option>
            <option value="NATIONAL">National Admin</option>
            <option value="STATE">State Admin</option>
            <option value="DISTRICT">District Officer</option>
            <option value="PHC">PHC Staff</option>
          </select>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…" style={{ ...inputStyle, width: 200 }} />
          <button type="button" onClick={() => setShowModal(true)} style={{ height: 36, padding: "0 16px", borderRadius: "var(--radius-sm)", background: "var(--color-primary)", color: "#fff", border: "none", fontWeight: 600, fontSize: "var(--font-size-sm)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person_add</span>Create User
          </button>
        </div>
      </div>
      <div className="stitch-card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "var(--color-surface-container)", fontSize: "var(--font-size-xs)", fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>
              <th style={{ padding: "10px 20px" }}>Username</th>
              <th style={{ padding: "10px 20px" }}>Role</th>
              <th style={{ padding: "10px 20px" }}>Assigned To</th>
              <th style={{ padding: "10px 20px", textAlign: "center" }}>Status</th>
              <th style={{ padding: "10px 20px", textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, i) => {
              const badge = ROLE_BADGE[u.role] ?? ROLE_BADGE.PHC;
              const location = u.phc_name ? `PHC: ${u.phc_name}` : u.district_name ? `District: ${u.district_name}` : u.state_name ? `State: ${u.state_name}` : "National";
              return (
                <tr key={u.id} style={{ background: i % 2 === 0 ? "#fff" : "#faf9f7", borderBottom: "1px solid var(--color-border-subtle)" }}>
                  <td style={{ padding: "11px 20px", fontWeight: 600, fontSize: "var(--font-size-sm)" }}>{u.username}</td>
                  <td style={{ padding: "11px 20px" }}>
                    <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: badge.bg, color: badge.color }}>{badge.label}</span>
                  </td>
                  <td style={{ padding: "11px 20px", fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }}>{location}</td>
                  <td style={{ padding: "11px 20px", textAlign: "center" }}>
                    <span style={{ padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: u.is_active ? "var(--risk-safe-bg)" : "var(--color-surface-low)", color: u.is_active ? "var(--risk-safe-text)" : "var(--color-text-secondary)" }}>
                      {u.is_active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td style={{ padding: "11px 20px", textAlign: "right" }}>
                    <button type="button" onClick={() => toggleActive(u)} title={u.is_active ? "Disable" : "Enable"} style={{ border: "none", background: "none", cursor: "pointer", color: u.is_active ? "var(--risk-critical-text)" : "var(--color-secondary)", padding: 4 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{u.is_active ? "toggle_on" : "toggle_off"}</span>
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: "var(--color-text-secondary)" }}>No users found.</td></tr>}
          </tbody>
        </table>
      </div>
      {showModal && <AddUserModal states={states} districts={districts} phcs={phcs} onClose={() => setShowModal(false)} onSaved={onRefresh} />}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function NationalDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("states");
  const [states, setStates] = useState<StateRow[]>([]);
  const [districts, setDistricts] = useState<DistrictRow[]>([]);
  const [phcs, setPhcs] = useState<Phc[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadAll = useCallback(() => {
    Promise.all([getStates(), getDistricts(), getPhcs(), getUsers().catch(() => [])])
      .then(([s, d, p, u]) => { setStates(s); setDistricts(d); setPhcs(p); setUsers(u); })
      .catch(() => setLoadError("Could not load data."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(loadAll, [loadAll]);

  async function handleLogout() { await logout(); navigate("/login"); }

  // Summary stats
  const totalPhcs = phcs.length;
  const activePhcs = phcs.filter(p => p.is_active).length;
  const activeUsers = users.filter(u => u.is_active).length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      {/* Header */}
      <header style={{ background: "#fff", borderBottom: "1px solid var(--color-border)", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 30, boxShadow: "var(--shadow-card)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontWeight: 700, fontSize: "var(--font-size-lg)", color: "var(--color-primary)" }}>ProjectH</span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--radius-sm)", background: "rgba(124,58,237,.1)", color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.05em" }}>National Admin</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }}>
            Signed in as <strong>{user?.username}</strong>
          </span>
          <button type="button" onClick={handleLogout} style={{ height: 30, padding: "0 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border-strong)", background: "#fff", fontSize: "var(--font-size-xs)", cursor: "pointer", color: "var(--color-text-secondary)" }}>
            Log Out
          </button>
        </div>
      </header>

      {/* Page title + summary */}
      <div style={{ background: "#fff", borderBottom: "1px solid var(--color-border)", padding: "20px 24px 0" }}>
        <h1 style={{ margin: "0 0 4px", fontSize: "var(--font-size-xl)", fontWeight: 700, color: "var(--color-primary)" }}>
          National Health Administration
        </h1>
        <p style={{ margin: "0 0 16px", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
          Manage all states, districts, PHCs, and user accounts across the entire country.
        </p>
        {/* Stats strip */}
        <div style={{ display: "flex", gap: 32, marginBottom: 0 }}>
          {[
            { label: "States", value: states.length, icon: "public" },
            { label: "Districts", value: districts.length, icon: "domain" },
            { label: `PHCs (${activePhcs} active)`, value: totalPhcs, icon: "local_hospital" },
            { label: `Users (${activeUsers} active)`, value: users.length, icon: "group" },
          ].map(stat => (
            <div key={stat.label} style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 16 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--color-primary)" }}>{stat.icon}</span>
              <span style={{ fontSize: "var(--font-size-xl)", fontWeight: 700, color: "var(--color-primary)" }} className="tabular-nums">{stat.value}</span>
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }}>{stat.label}</span>
            </div>
          ))}
        </div>
        <TabBar active={tab} onChange={setTab} />
      </div>

      {/* Content */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>
        {loading && <p style={{ color: "var(--color-text-secondary)" }}>Loading…</p>}
        {loadError && <p style={{ color: "var(--risk-critical-text)" }}>{loadError}</p>}
        {!loading && !loadError && (
          <>
            {tab === "states"    && <StatesTab    states={states} districts={districts} phcs={phcs} onRefresh={loadAll} />}
            {tab === "districts" && <DistrictsTab states={states} districts={districts} phcs={phcs} onRefresh={loadAll} />}
            {tab === "phcs"      && <PhcsTab      districts={districts} phcs={phcs} onRefresh={loadAll} />}
            {tab === "users"     && <UsersTab     states={states} districts={districts} phcs={phcs} users={users} onRefresh={loadAll} />}
          </>
        )}
      </main>
    </div>
  );
}

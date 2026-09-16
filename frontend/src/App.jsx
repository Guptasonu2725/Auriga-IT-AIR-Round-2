import { useEffect, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Box,
  CalendarDays,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock3,
  LayoutDashboard,
  Menu,
  PackageCheck,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { api, getError } from "./api";

const navItems = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "equipment", label: "Equipment", icon: Box },
  { id: "availability", label: "Availability", icon: CalendarDays },
  { id: "borrow", label: "New borrowing", icon: Plus },
  { id: "borrowings", label: "Borrowings", icon: ClipboardList },
  { id: "profile", label: "My profile", icon: UserRound },
];
const today = new Date().toISOString().slice(0, 10);
const formatMoney = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const formatDate = (value) =>
  value
    ? new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

function App() {
  const [page, setPage] = useState(() => {
    const route = window.location.hash.slice(1);
    return navItems.some((item) => item.id === route) ? route : "dashboard";
  });
  const [dashboard, setDashboard] = useState(null);
  const [equipment, setEquipment] = useState([]);
  const [borrowers, setBorrowers] = useState([]);
  const [borrowings, setBorrowings] = useState([]);
  const [notice, setNotice] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [signedIn, setSignedIn] = useState(
    () => localStorage.getItem("av-room-session") !== "signed-out",
  );
  const [role, setRole] = useState(
    () => localStorage.getItem("av-room-role") || "operator",
  );

  useEffect(() => {
    window.history.replaceState({ avRoom: true, page }, "", `#${page}`);
    const handlePopState = (event) => {
      const route = event.state?.page || window.location.hash.slice(1);
      setPage(navItems.some((item) => item.id === route) ? route : "dashboard");
      setMobileNav(false);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const refresh = () => setRefreshKey((key) => key + 1);
  useEffect(() => {
    setLoading(true);
    setLoadError("");
    Promise.all([
      api.get("/dashboard"),
      api.get("/equipment"),
      api.get("/borrowers"),
      api.get("/borrowings"),
    ])
      .then(([dash, items, people, loans]) => {
        setDashboard(dash.data);
        setEquipment(items.data);
        setBorrowers(people.data);
        setBorrowings(loans.data);
      })
      .catch((err) => {
        const message = getError(err);
        setLoadError(message);
        setNotice({ type: "error", text: message });
      })
      .finally(() => setLoading(false));
  }, [refreshKey]);
  const navigate = (next) => {
    if (next === page) return;
    setPage(next);
    setMobileNav(false);
    setNotice(null);
    window.history.pushState({ avRoom: true, page: next }, "", `#${next}`);
  };
  const goBack = () => {
    if (page === "dashboard") return;
    if (window.history.state?.avRoom && window.history.length > 1) {
      window.history.back();
    } else {
      navigate("dashboard");
    }
  };
  const signOut = () => {
    localStorage.setItem("av-room-session", "signed-out");
    setSignedIn(false);
  };

  if (!signedIn) {
    return (
      <SignIn
        onSignIn={(nextRole) => {
          localStorage.setItem("av-room-session", "active");
          localStorage.setItem("av-room-role", nextRole);
          setRole(nextRole);
          setSignedIn(true);
        }}
      />
    );
  }

  if (role === "student") {
    return (
      <StudentPortal
        equipment={equipment}
        borrowers={borrowers}
        borrowings={borrowings}
        loading={loading}
        onRefresh={refresh}
        onSignOut={signOut}
      />
    );
  }

  return (
    <div className="app-shell">
      <aside className={mobileNav ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <div className="brand-mark">
            <Camera size={20} />
          </div>
          <div>
            <strong>AV ROOM</strong>
            <span>Equipment desk</span>
          </div>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={page === id ? "nav-item active" : "nav-item"}
              onClick={() => navigate(id)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {id === "borrowings" &&
                borrowings.filter((loan) => loan.status === "ACTIVE").length >
                  0 && (
                  <b className="nav-count">
                    {
                      borrowings.filter((loan) => loan.status === "ACTIVE")
                        .length
                    }
                  </b>
                )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="rule" />
          <div className="status-line">
            <span className="status-dot" />
            System online
          </div>
          <small>
            AV Room Management
            <br />
            Academic year 2026–27
          </small>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setMobileNav(!mobileNav)}
            aria-label="Open navigation"
          >
            <Menu size={21} />
          </button>
          <button className="back-button" onClick={goBack} disabled={page === "dashboard"} aria-label="Go back" title="Go back">
            <ArrowLeft size={18} />
          </button>
          <div className="breadcrumb">
            <span>AV ROOM</span>
            <span className="breadcrumb-divider">/</span>
            <strong>{navItems.find((item) => item.id === page)?.label}</strong>
          </div>
          <button className="topbar-user" onClick={() => navigate("profile")} aria-label="Open my profile">
            <div className="avatar">DR</div>
            <div>
              <strong>Desk operator</strong>
              <small>Room 204</small>
            </div>
          </button>
        </header>
        <div className="page-wrap">
          {notice && (
            <div className={`notice ${notice.type}`}>
              <span>
                {notice.type === "success" ? (
                  <CheckCircle2 size={17} />
                ) : (
                  <X size={17} />
                )}
              </span>
              {notice.text}
              <button onClick={() => setNotice(null)}>
                <X size={15} />
              </button>
            </div>
          )}
          {page === "dashboard" && (
            <Dashboard
              data={dashboard}
              navigate={navigate}
              loading={loading}
              error={loadError}
              retry={refresh}
            />
          )}
          {page === "equipment" && <Equipment items={equipment} />}
          {page === "availability" && <Availability equipment={equipment} />}
          {page === "borrow" && (
            <Borrow
              equipment={equipment}
              borrowers={borrowers}
              onDone={(message) => {
                setNotice({ type: "success", text: message });
                refresh();
                navigate("borrowings");
              }}
            />
          )}
          {page === "borrowings" && (
            <Borrowings
              loans={borrowings}
              onDone={(message) => {
                setNotice({ type: "success", text: message });
                refresh();
              }}
            />
          )}
          {page === "profile" && (
            <Profile loans={borrowings} navigate={navigate} onSignOut={signOut} />
          )}
        </div>
      </main>
    </div>
  );
}

function SignIn({ onSignIn }) {
  const [email, setEmail] = useState("avdesk@college.edu");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("operator");
  const submit = (event) => {
    event.preventDefault();
    onSignIn(role);
  };
  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="auth-brand"><div className="brand-mark"><Camera size={20} /></div><strong>AV ROOM</strong></div>
        <div className="eyebrow">Equipment desk</div>
        <h1>Welcome back</h1>
        <p>Choose your workspace to browse equipment or manage the AV room.</p>
        <div className="role-picker">
          <button type="button" className={role === "operator" ? "selected" : ""} onClick={() => setRole("operator")}><ShieldCheck size={16} /><span><strong>Operator</strong><small>Manage the room</small></span></button>
          <button type="button" className={role === "student" ? "selected" : ""} onClick={() => setRole("student")}><UserRound size={16} /><span><strong>Student</strong><small>Borrow equipment</small></span></button>
        </div>
        <form onSubmit={submit} className="auth-form">
          <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter any password" required /></label>
          <button className="button primary full">Sign in <ArrowRight size={16} /></button>
        </form>
        <small className="auth-note">Demo access · Authentication and roles are local to this MVP.</small>
      </section>
    </main>
  );
}

function StudentPortal({ equipment, borrowers, borrowings, loading, onRefresh, onSignOut }) {
  const [tab, setTab] = useState("browse");
  const [borrowerId, setBorrowerId] = useState(borrowers[0]?.id || "");
  const [equipmentId, setEquipmentId] = useState(equipment[0]?.id || "");
  const [borrowDate, setBorrowDate] = useState(today);
  const [dueDate, setDueDate] = useState(today);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!borrowerId && borrowers[0]) setBorrowerId(borrowers[0].id);
    if (!equipmentId && equipment[0]) setEquipmentId(equipment[0].id);
  }, [borrowers, equipment, borrowerId, equipmentId]);
  const selectedEquipment = equipment.find((item) => item.id === Number(equipmentId));
  const myBorrowings = borrowings.filter((loan) => loan.borrower_id === Number(borrowerId));
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage(null);
    try {
      await api.post("/borrowings", { borrowerId, equipmentId, borrowDate, dueDate });
      setMessage("Your equipment request was created successfully.");
      setTab("borrowings");
      onRefresh();
    } catch (err) {
      setError(getError(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="student-shell">
      <header className="student-topbar">
        <div className="student-brand"><div className="brand-mark"><Camera size={20} /></div><div><strong>AV ROOM</strong><span>Student lending portal</span></div></div>
        <div className="student-user"><div className="avatar student-avatar">ST</div><button onClick={onSignOut}>Sign out</button></div>
      </header>
      <main className="student-main">
        <div className="student-welcome"><div><div className="eyebrow">STUDENT WORKSPACE</div><h1>Borrow the gear for your next project.</h1><p>Find available equipment, choose your dates, and keep track of returns in one place.</p></div><div className="student-rule"><span>Self-service</span><strong>3 items max</strong></div></div>
        <nav className="student-tabs"><button className={tab === "browse" ? "active" : ""} onClick={() => setTab("browse")}><Box size={16} /> Browse equipment</button><button className={tab === "availability" ? "active" : ""} onClick={() => setTab("availability")}><CalendarDays size={16} /> Check availability</button><button className={tab === "borrow" ? "active" : ""} onClick={() => setTab("borrow")}><Plus size={16} /> Request equipment</button><button className={tab === "borrowings" ? "active" : ""} onClick={() => setTab("borrowings")}><ClipboardList size={16} /> My borrowings</button></nav>
        {message && <div className="notice success"><CheckCircle2 size={17} />{message}<button onClick={() => setMessage(null)}><X size={15} /></button></div>}
        {tab === "browse" && <section className="student-equipment-grid">{equipment.map((item) => <article className="student-equipment-card" key={item.id}><div className="student-card-icon"><Camera size={22} /></div><div className="category-label">{item.category}</div><h2>{item.name}</h2><p>{item.description}</p><div className="student-card-meta"><span>{item.available_units} of {item.total_units} free</span><strong>{formatMoney(item.deposit_amount)} deposit</strong></div><button className="button primary full" onClick={() => { setEquipmentId(item.id); setTab("borrow"); }}>Request this equipment <ArrowRight size={16} /></button></article>)}</section>}
        {tab === "availability" && <Availability equipment={equipment} />}
        {tab === "borrow" && <section className="student-borrow-layout"><form className="panel student-borrow-form" onSubmit={submit}><div className="eyebrow">CHECKOUT</div><h2>Request equipment</h2><p>Choose who is borrowing the item and when you will return it.</p><label>Student<select value={borrowerId} onChange={(event) => setBorrowerId(event.target.value)}>{borrowers.map((person) => <option value={person.id} key={person.id}>{person.name} · {person.email}</option>)}</select></label><label>Equipment<select value={equipmentId} onChange={(event) => setEquipmentId(event.target.value)}>{equipment.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.available_units} available</option>)}</select></label><div className="date-grid"><label>Borrow date<input type="date" value={borrowDate} onChange={(event) => setBorrowDate(event.target.value)} /></label><label>Return date<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label></div>{error && <div className="inline-error">{error}</div>}<button className="button primary full" disabled={saving || !selectedEquipment}>{saving ? "Submitting…" : "Submit request"} <ArrowRight size={16} /></button></form><aside className="student-policy"><ShieldCheck size={22} /><h2>Before you request</h2><p>Bring your student ID when collecting equipment. The deposit is refundable after the item is returned.</p><div><strong>{formatMoney(selectedEquipment?.deposit_amount)}</strong><span>refundable deposit</span></div><div><strong>{formatMoney(selectedEquipment?.late_fee_per_day)}/day</strong><span>late return fee</span></div></aside></section>}
        {tab === "borrowings" && <section className="panel student-loans"><div className="panel-head"><div><h2>My borrowings</h2><p>Keep an eye on due dates and active requests.</p></div></div>{loading ? <Loading /> : myBorrowings.length ? myBorrowings.map((loan) => <div className="student-loan" key={loan.id}><div className="student-loan-icon"><Camera size={17} /></div><div><strong>{loan.equipment_name} · {loan.unit_code}</strong><span>Due {formatDate(loan.due_date)}</span></div><StatusPill status={loan.status === "RETURNED" ? "Returned" : loan.due_date < today ? "Overdue" : "Active"} /></div>) : <EmptyState icon={ClipboardList} title="No borrowings yet" description="Choose equipment from the browse tab to get started." />}</section>}
      </main>
    </div>
  );
}

function Profile({ loans, navigate, onSignOut }) {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [overdueAlerts, setOverdueAlerts] = useState(true);
  const activeLoans = loans.filter((loan) => loan.status === "ACTIVE").length;
  const returnedLoans = loans.filter((loan) => loan.status === "RETURNED").length;

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="My profile"
        description="Manage your desk identity and notification preferences."
        action={<div className="profile-actions"><button className="button secondary" onClick={onSignOut}><X size={16} /> Sign out</button><button className="button primary" onClick={() => navigate("borrow")}><Plus size={17} /> New borrowing</button></div>}
      />
      <section className="profile-layout">
        <article className="panel profile-card">
          <div className="profile-hero">
            <div className="profile-avatar">DR</div>
            <div>
              <div className="eyebrow">AV room operator</div>
              <h2>Desk operator</h2>
              <p>Room 204 · Academic year 2026–27</p>
            </div>
          </div>
          <div className="profile-details">
            <div><span>Work email</span><strong>avdesk@college.edu</strong></div>
            <div><span>Phone</span><strong>+91 90000 20404</strong></div>
            <div><span>Role</span><strong>Equipment desk manager</strong></div>
            <div><span>Access</span><strong><span className="access-dot" /> Active</strong></div>
          </div>
        </article>
        <aside className="profile-side">
          <section className="panel profile-stats">
            <div className="panel-head"><div><h2>Desk activity</h2><p>Your current workspace totals</p></div></div>
            <div className="profile-stat-grid"><div><strong>{activeLoans}</strong><span>Active loans</span></div><div><strong>{returnedLoans}</strong><span>Completed returns</span></div></div>
          </section>
          <section className="panel preferences-panel">
            <div className="panel-head"><div><h2>Preferences</h2><p>Keep the desk informed</p></div></div>
            <label className="toggle-row"><span><strong>Email updates</strong><small>Receive borrowing confirmations</small></span><input type="checkbox" checked={emailAlerts} onChange={(event) => setEmailAlerts(event.target.checked)} /><i /></label>
            <label className="toggle-row"><span><strong>Overdue reminders</strong><small>Highlight returns past due</small></span><input type="checkbox" checked={overdueAlerts} onChange={(event) => setOverdueAlerts(event.target.checked)} /><i /></label>
          </section>
        </aside>
      </section>
    </>
  );
}

function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="page-header">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
function Dashboard({ data, navigate, loading, error, retry }) {
  if (loading && !data) return <Loading />;
  if (error && !data) return <DataError message={error} retry={retry} />;
  const stats = [
    { label: "Total units", value: data.totalUnits, icon: Box, tone: "blue" },
    {
      label: "Available now",
      value: data.availableUnits,
      icon: PackageCheck,
      tone: "green",
    },
    {
      label: "Currently borrowed",
      value: data.borrowedUnits,
      icon: Activity,
      tone: "amber",
    },
    {
      label: "Overdue returns",
      value: data.overdueBorrowings,
      icon: Clock3,
      tone: "red",
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow="Wednesday · 16 September 2026"
        title="Good morning, operator"
        description="Here’s what’s happening in the AV room today."
        action={
          <button className="button primary" onClick={() => navigate("borrow")}>
            <Plus size={17} /> New borrowing
          </button>
        }
      />
      <section className="stats-grid">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <div className="stat-card" key={label}>
            <div className={`stat-icon ${tone}`}>
              <Icon size={19} />
            </div>
            <div>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          </div>
        ))}
      </section>
      <div className="dashboard-grid">
        <section className="panel activity-panel">
          <div className="panel-head">
            <div>
              <h2>Recent activity</h2>
              <p>Latest movements in the equipment room</p>
            </div>
            <button
              className="text-button"
              onClick={() => navigate("borrowings")}
            >
              View all <ArrowRight size={15} />
            </button>
          </div>
          {data.recentActivity.length ? (
            <div className="activity-list">
              {data.recentActivity.map((loan) => (
                <ActivityRow key={loan.id} loan={loan} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Activity}
              title="No activity yet"
              description="Borrowing activity will appear here."
            />
          )}
        </section>
        <section className="panel quick-panel">
          <div className="panel-head">
            <div>
              <h2>Quick actions</h2>
              <p>Common desk workflows</p>
            </div>
          </div>
          <button className="quick-action" onClick={() => navigate("borrow")}>
            <div className="quick-icon blue">
              <Plus size={18} />
            </div>
            <div>
              <strong>Borrow equipment</strong>
              <span>Create a new checkout</span>
            </div>
            <ArrowRight size={16} />
          </button>
          <button
            className="quick-action"
            onClick={() => navigate("availability")}
          >
            <div className="quick-icon orange">
              <Search size={18} />
            </div>
            <div>
              <strong>Check availability</strong>
              <span>Plan a future booking</span>
            </div>
            <ArrowRight size={16} />
          </button>
          <div className="limit-note">
            <ShieldCheck size={18} />
            <span>
              <strong>Borrowing limit</strong>Each borrower can hold up to 3
              active items.
            </span>
          </div>
        </section>
      </div>
    </>
  );
}
function ActivityRow({ loan }) {
  return (
    <div className="activity-row">
      <div className="item-symbol">
        <Camera size={17} />
      </div>
      <div className="activity-info">
        <strong>
          {loan.equipment_name} <span>· {loan.unit_code}</span>
        </strong>
        <small>
          {loan.borrower_name} · due {formatDate(loan.due_date)}
        </small>
      </div>
      <StatusPill
        status={
          loan.status === "RETURNED"
            ? "Returned"
            : loan.due_date < today
              ? "Overdue"
              : "Active"
        }
      />
    </div>
  );
}
function StatusPill({ status }) {
  return <span className={`pill ${status.toLowerCase()}`}>{status}</span>;
}
function Equipment({ items }) {
  const [query, setQuery] = useState("");
  const filtered = items.filter((item) =>
    `${item.name} ${item.category}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Equipment"
        description="Every physical unit, accounted for."
        action={
          <div className="search-box">
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search equipment"
            />
          </div>
        }
      />
      <div className="equipment-grid">
        {filtered.map((item) => (
          <EquipmentCard item={item} key={item.id} />
        ))}
      </div>
    </>
  );
}
function EquipmentCard({ item }) {
  const availability = item.total_units
    ? Math.round((item.available_units / item.total_units) * 100)
    : 0;
  return (
    <article className="equipment-card">
      <div className="equipment-card-top">
        <div className="equipment-icon">
          <Camera size={22} />
        </div>
        <StatusPill status={item.available_units ? "Available" : "In use"} />
      </div>
      <div className="category-label">{item.category}</div>
      <h2>{item.name}</h2>
      <p>{item.description}</p>
      <div className="meter-label">
        <span>Availability</span>
        <strong>
          {item.available_units} <em>/ {item.total_units}</em>
        </strong>
      </div>
      <div className="meter">
        <span style={{ width: `${availability}%` }} />
      </div>
      <div className="equipment-footer">
        <span>
          Deposit <strong>{formatMoney(item.deposit_amount)}</strong>
        </span>
        <span>
          Late fee <strong>{formatMoney(item.late_fee_per_day)}/day</strong>
        </span>
      </div>
    </article>
  );
}
function Availability({ equipment }) {
  const [selected, setSelected] = useState(equipment[0]?.id || "");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!selected && equipment[0]) setSelected(equipment[0].id);
  }, [equipment, selected]);
  const check = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      setResult(
        (
          await api.get(`/equipment/${selected}/availability`, {
            params: { startDate, endDate },
          })
        ).data,
      );
    } catch (err) {
      setResult({ error: getError(err) });
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="Planning"
        title="Availability"
        description="Check which units are free for a date range."
      />
      <section className="panel availability-panel">
        <form className="filter-form" onSubmit={check}>
          <label>
            Equipment
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              {equipment.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Start date
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label>
            End date
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
          <button className="button primary" disabled={loading}>
            {loading ? "Checking…" : "Check availability"}
          </button>
        </form>
        {result?.error && <div className="inline-error">{result.error}</div>}
        {result && !result.error && (
          <div className="availability-result">
            <div className="availability-summary">
              <div>
                <span>{result.equipment.name}</span>
                <strong>
                  {result.availableUnits}{" "}
                  <em>/ {result.totalUnits} units available</em>
                </strong>
              </div>
              <StatusPill
                status={result.availableUnits ? "Available" : "Fully booked"}
              />
            </div>
            <div className="unit-list">
              {result.units.length ? (
                result.units.map((unit) => (
                  <div className="unit-chip" key={unit.id}>
                    <span className="status-dot" />
                    {unit.unit_code}
                    <small>Available</small>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={CalendarDays}
                  title="No units available"
                  description="Try a different date range."
                />
              )}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
function Borrow({ equipment, borrowers, onDone }) {
  const [form, setForm] = useState({
    borrowerId: borrowers[0]?.id || "",
    equipmentId: equipment[0]?.id || "",
    borrowDate: today,
    dueDate: today,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNewBorrower, setShowNewBorrower] = useState(false);
  const [newBorrower, setNewBorrower] = useState({ name: "", email: "", phone: "" });
  const [borrowerLoading, setBorrowerLoading] = useState(false);
  useEffect(() => {
    setForm((current) => ({
      ...current,
      borrowerId: current.borrowerId || borrowers[0]?.id || "",
      equipmentId: current.equipmentId || equipment[0]?.id || "",
    }));
  }, [borrowers, equipment]);
  const selected = equipment.find(
    (item) => item.id === Number(form.equipmentId),
  );
  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const updateNewBorrower = (key, value) =>
    setNewBorrower((current) => ({ ...current, [key]: value }));
  const createBorrower = async (event) => {
    event.preventDefault();
    setError("");
    setBorrowerLoading(true);
    try {
      const created = (await api.post("/borrowers", newBorrower)).data;
      borrowers.push(created);
      update("borrowerId", created.id);
      setNewBorrower({ name: "", email: "", phone: "" });
      setShowNewBorrower(false);
    } catch (err) {
      setError(getError(err));
    } finally {
      setBorrowerLoading(false);
    }
  };
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/borrowings", form);
      onDone(`${selected.name} checked out successfully.`);
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="Checkout"
        title="Borrow equipment"
        description="Create a borrowing record and reserve a physical unit."
      />
      <section className="form-layout">
        <form className="panel borrow-form" onSubmit={submit}>
          <div className="form-section">
            <h2>Borrower details</h2>
            <p>Select the person taking responsibility for the equipment.</p>
            <label>
              Borrower
              <select
                value={form.borrowerId}
                onChange={(e) => update("borrowerId", e.target.value)}
              >
                {borrowers.map((person) => (
                  <option value={person.id} key={person.id}>
                    {person.name} · {person.email}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="text-button add-borrower-button"
              onClick={() => setShowNewBorrower((visible) => !visible)}
            >
              <UserRound size={15} /> {showNewBorrower ? "Cancel" : "Add new borrower"}
            </button>
            {showNewBorrower && (
              <div className="new-borrower-fields">
                <label>
                  Full name
                  <input value={newBorrower.name} onChange={(event) => updateNewBorrower("name", event.target.value)} required />
                </label>
                <label>
                  Email
                  <input type="email" value={newBorrower.email} onChange={(event) => updateNewBorrower("email", event.target.value)} required />
                </label>
                <label>
                  Phone
                  <input value={newBorrower.phone} onChange={(event) => updateNewBorrower("phone", event.target.value)} required />
                </label>
                <button type="button" className="button secondary" onClick={createBorrower} disabled={borrowerLoading}>
                  {borrowerLoading ? "Saving…" : "Save borrower"}
                </button>
              </div>
            )}
          </div>
          <div className="form-section">
            <h2>Equipment & dates</h2>
            <p>The system assigns the first available physical unit.</p>
            <label>
              Equipment
              <select
                value={form.equipmentId}
                onChange={(e) => update("equipmentId", e.target.value)}
              >
                {equipment.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name} · {item.available_units} available
                  </option>
                ))}
              </select>
            </label>
            <div className="date-grid">
              <label>
                Borrow date
                <input
                  type="date"
                  value={form.borrowDate}
                  onChange={(e) => update("borrowDate", e.target.value)}
                />
              </label>
              <label>
                Due date
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => update("dueDate", e.target.value)}
                />
              </label>
            </div>
          </div>
          {error && <div className="inline-error">{error}</div>}
          <div className="form-actions">
            <button
              type="submit"
              className="button primary"
              disabled={loading || !borrowers.length}
            >
              {loading ? "Creating…" : "Confirm borrowing"}
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
        <aside className="checkout-summary">
          <div className="summary-icon">
            <ShieldCheck size={20} />
          </div>
          <h2>Checkout summary</h2>
          <p>Review the deposit and late-fee policy before confirming.</p>
          <div className="summary-line">
            <span>Refundable deposit</span>
            <strong>{formatMoney(selected?.deposit_amount)}</strong>
          </div>
          <div className="summary-line">
            <span>Late fee per day</span>
            <strong>{formatMoney(selected?.late_fee_per_day)}</strong>
          </div>
          <div className="summary-rule" />
          <div className="summary-foot">
            <CheckCircle2 size={16} /> Deposit is recorded against this
            borrowing
          </div>
        </aside>
      </section>
    </>
  );
}
function Borrowings({ loans, onDone }) {
  const [filter, setFilter] = useState("ACTIVE");
  const [returning, setReturning] = useState(null);
  const shown = loans.filter(
    (loan) => filter === "ALL" || loan.status === filter,
  );
  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Borrowings & returns"
        description="Track active checkouts and close the loop when gear comes back."
        action={
          <div className="segmented">
            <button
              className={filter === "ACTIVE" ? "selected" : ""}
              onClick={() => setFilter("ACTIVE")}
            >
              Active
            </button>
            <button
              className={filter === "RETURNED" ? "selected" : ""}
              onClick={() => setFilter("RETURNED")}
            >
              Returned
            </button>
            <button
              className={filter === "ALL" ? "selected" : ""}
              onClick={() => setFilter("ALL")}
            >
              All
            </button>
          </div>
        }
      />
      {shown.length ? (
        <section className="panel table-panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Equipment</th>
                  <th>Borrower</th>
                  <th>Borrowed</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shown.map((loan) => (
                  <tr key={loan.id}>
                    <td>
                      <strong>{loan.equipment_name}</strong>
                      <small>{loan.unit_code}</small>
                    </td>
                    <td>
                      <strong>{loan.borrower_name}</strong>
                      <small>{loan.borrower_email}</small>
                    </td>
                    <td>{formatDate(loan.borrow_date)}</td>
                    <td
                      className={
                        loan.status === "ACTIVE" && loan.due_date < today
                          ? "overdue-text"
                          : ""
                      }
                    >
                      {formatDate(loan.due_date)}
                    </td>
                    <td>
                      <StatusPill
                        status={
                          loan.status === "RETURNED"
                            ? "Returned"
                            : loan.due_date < today
                              ? "Overdue"
                              : "Active"
                        }
                      />
                    </td>
                    <td>
                      {loan.status === "ACTIVE" && (
                        <button
                          className="return-button"
                          onClick={() => setReturning(loan)}
                        >
                          Return <RotateCcw size={14} />
                        </button>
                      )}
                      {loan.status === "RETURNED" && (
                        <span className="refund-text">
                          Refund {formatMoney(loan.refund_amount)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div className="panel">
          <EmptyState
            icon={ClipboardList}
            title={`No ${filter.toLowerCase()} borrowings`}
            description="Records will appear here when the desk is used."
          />
        </div>
      )}
      {returning && (
        <ReturnModal
          loan={returning}
          close={() => setReturning(null)}
          onDone={onDone}
        />
      )}
    </>
  );
}
function ReturnModal({ loan, close, onDone }) {
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const lateDays = Math.max(
    0,
    Math.floor(
      (Date.parse(`${date}T00:00:00Z`) -
        Date.parse(`${loan.due_date}T00:00:00Z`)) /
        86400000,
    ),
  );
  const lateFee = lateDays * Number(loan.late_fee_per_day || 0);
  const refund = Math.max(0, Number(loan.deposit_amount || 0) - lateFee);
  const outstanding = Math.max(0, lateFee - Number(loan.deposit_amount || 0));
  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      const result = (
        await api.post(`/borrowings/${loan.id}/return`, { returnedDate: date })
      ).data;
      onDone(
        `Returned ${loan.equipment_name}. Refund due: ${formatMoney(result.refund_amount)}.`,
      );
      close();
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <button className="modal-close" onClick={close}>
          <X size={18} />
        </button>
        <div className="modal-icon">
          <RotateCcw size={20} />
        </div>
        <div className="eyebrow">Close borrowing</div>
        <h2>Return {loan.equipment_name}</h2>
        <p>
          {loan.unit_code} · borrowed by {loan.borrower_name}
        </p>
        <label>
          Actual return date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <div className="return-note">
          <ShieldCheck size={16} />
          <span>
            Due {formatDate(loan.due_date)}. The late fee and refundable amount
            will be calculated automatically.
          </span>
        </div>
        <div className="return-preview">
          <div><span>Late days</span><strong>{lateDays}</strong></div>
          <div><span>Late fee</span><strong>{formatMoney(lateFee)}</strong></div>
          <div><span>Refund</span><strong className="refund-text">{formatMoney(refund)}</strong></div>
          {outstanding > 0 && <div><span>Outstanding</span><strong className="overdue-text">{formatMoney(outstanding)}</strong></div>}
        </div>
        {error && <div className="inline-error">{error}</div>}
        <button
          className="button primary full"
          onClick={submit}
          disabled={loading}
        >
          {loading ? "Processing…" : "Confirm return"}
        </button>
      </div>
    </div>
  );
}
function Loading() {
  return (
    <div className="loading">
      <div className="spinner" />
      Loading room data…
    </div>
  );
}
function DataError({ message, retry }) {
  return (
    <section className="data-error panel">
      <div className="data-error-icon"><X size={22} /></div>
      <div>
        <div className="eyebrow">Connection issue</div>
        <h2>Room data could not be loaded</h2>
        <p>{message}. Check that the API is running, then try again.</p>
        <button className="button primary" onClick={retry}>Retry connection</button>
      </div>
    </section>
  );
}
function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="empty-state">
      <Icon size={24} />
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  );
}

export default App;

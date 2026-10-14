"use client";
import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard,
  Ticket,
  Inbox,
  CheckSquare,
  ChartNoAxesCombined,
  Users,
  Building2,
  ShieldCheck,
  Workflow,
  Settings,
  Search,
  Plus,
  Bell,
  ChevronDown,
  Menu,
  LogOut,
  ArrowUpLeft,
  Command,
  Grid2X2,
  List,
  Download,
  SlidersHorizontal,
  X,
  Check,
  TriangleAlert,
} from "lucide-react";
import {
  TYPES,
  STATES,
  PRIORITIES,
  permissions,
  closed,
  number,
  date,
  type Snapshot,
  type Permission,
  type Ticket as TicketModel,
} from "@/lib/model";
import { sla } from "@/lib/sla";
import { Avatar, Brand, Empty, PageHeading, Pill } from "./ui";
import {
  CreateTicket,
  TicketDetail,
  TicketTable,
  StatusPill,
  PriorityBadge,
  TypeIcon,
  SLA,
} from "./tickets";
import Dashboard, { MetricCards } from "./dashboard";
import {
  Teams,
  UsersPanel,
  RolesPanel,
  SettingsPanel,
  WorkflowPanel,
} from "./admin";
const menus = [
  {
    id: "dashboard",
    label: "نمای کلی",
    icon: LayoutDashboard,
    permission: "dashboard.view",
  },
  {
    id: "tickets",
    label: "درخواست‌های من",
    icon: Ticket,
    permission: "tickets.read",
  },
  {
    id: "inbox",
    label: "صندوق تیم‌ها",
    icon: Inbox,
    permission: "tickets.team",
  },
  {
    id: "tasks",
    label: "کارهای شخصی",
    icon: CheckSquare,
    permission: "tickets.read",
  },
  {
    id: "reports",
    label: "گزارش‌ها و SLA",
    icon: ChartNoAxesCombined,
    permission: "reports.view",
  },
  { id: "users", label: "کاربران", icon: Users, permission: "users.manage" },
  { id: "teams", label: "تیم‌ها", icon: Building2, permission: "teams.manage" },
  {
    id: "roles",
    label: "نقش‌ها و دسترسی",
    icon: ShieldCheck,
    permission: "roles.manage",
  },
  {
    id: "workflows",
    label: "گردش کار",
    icon: Workflow,
    permission: "workflows.manage",
  },
  {
    id: "settings",
    label: "تنظیمات SLA",
    icon: Settings,
    permission: "settings.manage",
  },
];
export default function Workspace() {
  const [s, setS] = useState<Snapshot | null>(null),
    [fatal, setFatal] = useState(""),
    [view, setView] = useState("dashboard"),
    [mobile, setMobile] = useState(false),
    [create, setCreate] = useState(false),
    [detail, setDetail] = useState<string | null>(null),
    [toast, setToast] = useState<{ message: string; error: boolean } | null>(
      null,
    ),
    [query, setQuery] = useState(""),
    [now, setNow] = useState(new Date().toISOString());
  const navigate = useCallback((v: string) => {
    setView(v);
    setMobile(false);
    setQuery("");
    history.pushState({}, "", "/workspace?view=" + v);
  }, []);
  const load = useCallback(async () => {
    const r = await fetch("/api/state", { cache: "no-store" });
    if (r.status === 401) {
      window.location.href = "/login";
      return;
    }
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    setS(data);
  }, []);
  useEffect(() => {
    setView(new URLSearchParams(location.search).get("view") || "dashboard");
    load().catch((e) => setFatal(e.message));
    const onPop = () => {
      setView(new URLSearchParams(location.search).get("view") || "dashboard");
      setDetail(new URLSearchParams(location.search).get("ticket"));
    };
    onPop();
    window.addEventListener("popstate", onPop);
    const clock = setInterval(() => setNow(new Date().toISOString()), 30000);
    return () => {
      clearInterval(clock);
      window.removeEventListener("popstate", onPop);
    };
  }, [load]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);
  async function act(body: Record<string, unknown>) {
    try {
      const r = await fetch("/api/actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
        data = await r.json();
      if (!r.ok) throw new Error(data.error);
      await load();
      setToast({ message: "تغییرات با موفقیت ذخیره شد.", error: false });
      return true;
    } catch (e) {
      setToast({ message: (e as Error).message, error: true });
      return false;
    }
  }
  if (fatal)
    return (
      <main className="loading-page">
        <TriangleAlert />
        <h1>اتصال به سامانه برقرار نشد</h1>
        <p>{fatal}</p>
        <button className="btn primary" onClick={() => location.reload()}>
          تلاش دوباره
        </button>
      </main>
    );
  if (!s)
    return (
      <main className="loading-page">
        <span className="brand-mark">
          <Command size={28} />
        </span>
        <div className="loader" />
        <p>در حال آماده‌سازی فضای کاری…</p>
      </main>
    );
  const p = permissions(s, s.current_user),
    allowed = menus.filter((m) => p.includes(m.permission as Permission));
  const selected = menus.find((m) => m.id === view),
    authorized = selected && p.includes(selected.permission as Permission);
  const open = s.tickets.filter((t) => !closed(t)),
    attention = open.filter((t) => {
      const v = sla(t, s.settings, now);
      return v.remaining !== null && v.tone !== "success";
    });
  const current = s.tickets.find((t) => t.id === detail);
  function openTicket(id: string) {
    setDetail(id);
    history.pushState({}, "", "/workspace?view=" + view + "&ticket=" + id);
  }
  function closeTicket() {
    setDetail(null);
    history.replaceState({}, "", "/workspace?view=" + view);
  }
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        رفتن به محتوای اصلی
      </a>
      {mobile && (
        <button
          className="mobile-scrim"
          onClick={() => setMobile(false)}
          aria-label="بستن منو"
        />
      )}
      <aside className={"sidebar " + (mobile ? "is-open" : "")}>
        <Brand />
        <button
          className="workspace-select"
          onClick={() =>
            navigate(p.includes("tickets.team") ? "inbox" : "tickets")
          }
        >
          <span className="workspace-symbol">ر</span>
          <span>
            <b>فضای کاری سازمان</b>
            <small>
              {s.teams.find((t) => t.id === s.current_user.team_id)?.name}
            </small>
          </span>
          <ChevronDown size={15} />
        </button>
        <div className="nav-label">فضای کاری</div>
        <nav>
          {allowed
            .filter((m) => menus.indexOf(m) < 5)
            .map((m) => (
              <button
                key={m.id}
                className={"nav-item " + (view === m.id ? "active" : "")}
                onClick={() => navigate(m.id)}
                aria-current={view === m.id ? "page" : undefined}
              >
                <m.icon size={20} />
                <span>{m.label}</span>
                {m.id === "tickets" && (
                  <span className="nav-count">
                    {number(
                      open.filter(
                        (t) =>
                          t.assignee_id === s.current_user.id ||
                          t.requester_id === s.current_user.id,
                      ).length,
                    )}
                  </span>
                )}
              </button>
            ))}
        </nav>
        {allowed.some((m) => menus.indexOf(m) >= 5) && (
          <>
            <div className="nav-label admin-label">مدیریت سازمان</div>
            <nav>
              {allowed
                .filter((m) => menus.indexOf(m) >= 5)
                .map((m) => (
                  <button
                    key={m.id}
                    className={"nav-item " + (view === m.id ? "active" : "")}
                    onClick={() => navigate(m.id)}
                    aria-current={view === m.id ? "page" : undefined}
                  >
                    <m.icon size={19} />
                    <span>{m.label}</span>
                  </button>
                ))}
            </nav>
          </>
        )}
        <div className="sidebar-bottom">
          <a className="sidebar-help" href="/">
            <span>
              <Command size={19} />
            </span>
            <div>
              <b>آشنایی با راهکار</b>
              <small>درخواست‌ها در مسیر درست</small>
            </div>
            <ArrowUpLeft size={16} />
          </a>
          <div className="sidebar-user">
            <Avatar name={s.current_user.name} />
            <div>
              <b>{s.current_user.name}</b>
              <small>
                {s.roles.find((r) => r.id === s.current_user.role_id)?.name}
              </small>
            </div>
            <button
              className="icon-btn"
              aria-label="خروج از حساب"
              onClick={async () => {
                const r = await fetch("/api/auth", { method: "DELETE" });
                if (r.ok) location.href = "/login";
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-btn mobile-menu"
              aria-label="باز کردن منو"
              onClick={() => setMobile(true)}
            >
              <Menu size={21} />
            </button>
            <span>فضای کاری</span>
            <span className="crumb-divider">/</span>
            <b>{selected?.label || "صفحه"}</b>
          </div>
          <div className="topbar-actions">
            <span className="today">
              <span className="live-dot" />
              {new Intl.DateTimeFormat("fa-IR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                timeZone: "Asia/Tehran",
              }).format(new Date(now))}
            </span>
            <button
              className="icon-btn notifications"
              aria-label={"درخواست‌های نیازمند توجه: " + attention.length}
              onClick={() =>
                navigate(p.includes("reports.view") ? "reports" : "tickets")
              }
            >
              <Bell size={20} />
              {attention.length > 0 && <i />}
            </button>
            <span className="topbar-separator" />
            <Avatar name={s.current_user.name} size="small" />
          </div>
        </header>
        <main className="content" id="main-content">
          {s.demo && (
            <div className="demo-strip">
              <span>
                <i />
                محیط نمایشی · داده‌های نمونه قابل ویرایش هستند
              </span>
              <a href="/login">
                تغییر نقش <ArrowUpLeft size={13} />
              </a>
            </div>
          )}
          <div className="workspace-toolbar">
            <span className="workspace-heading">
              {view === "dashboard" ? "داشبورد فضای کاری" : selected?.label}
            </span>
            <div>
              <div className="global-search">
                <Search size={17} />
                <input
                  aria-label="جستجوی درخواست‌ها"
                  placeholder="جستجو در درخواست‌ها…"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    if (
                      !["tickets", "inbox", "tasks", "reports"].includes(view)
                    ) {
                      setView("tickets");
                      history.replaceState({}, "", "/workspace?view=tickets");
                    }
                  }}
                />
                <kbd>⌕</kbd>
              </div>
              {p.includes("tickets.create") && (
                <button className="btn primary" onClick={() => setCreate(true)}>
                  <Plus size={18} />
                  <span>درخواست جدید</span>
                </button>
              )}
            </div>
          </div>
          {!authorized ? (
            <Empty
              title="دسترسی به این بخش ندارید"
              text="برای تغییر سطح دسترسی با مدیر سامانه تماس بگیرید."
            />
          ) : view === "dashboard" ? (
            <Dashboard
              s={s}
              now={now}
              onOpen={openTicket}
              navigate={navigate}
            />
          ) : ["tickets", "inbox", "tasks", "reports"].includes(view) ? (
            <TicketsView
              key={view}
              view={view}
              s={s}
              query={query}
              now={now}
              onOpen={openTicket}
            />
          ) : view === "teams" ? (
            <Teams s={s} act={act} />
          ) : view === "users" ? (
            <UsersPanel s={s} act={act} />
          ) : view === "roles" ? (
            <RolesPanel s={s} act={act} />
          ) : view === "settings" ? (
            <SettingsPanel s={s} act={act} />
          ) : view === "workflows" ? (
            <WorkflowPanel s={s} act={act} />
          ) : null}
          <footer className="workspace-footer">
            <span>راهکار · فضای مشترک تیم‌ها</span>
            <span>زمان‌ها بر اساس منطقه زمانی تهران</span>
          </footer>
        </main>
      </div>
      {create && (
        <CreateTicket
          s={s}
          act={act}
          onClose={() => setCreate(false)}
          personal={view === "tasks"}
        />
      )}{" "}
      {current && (
        <TicketDetail
          key={current.id}
          t={current}
          s={s}
          act={act}
          now={now}
          onClose={closeTicket}
        />
      )}{" "}
      {toast && (
        <div
          className={"toast " + (toast.error ? "error" : "")}
          role={toast.error ? "alert" : "status"}
        >
          {toast.error ? <TriangleAlert size={19} /> : <Check size={19} />}
          <span>{toast.message}</span>
          <button
            className="icon-btn"
            onClick={() => setToast(null)}
            aria-label="بستن پیام"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
function TicketsView({
  view,
  s,
  query,
  now,
  onOpen,
}: {
  view: string;
  s: Snapshot;
  query: string;
  now: string;
  onOpen: (id: string) => void;
}) {
  const [status, setStatus] = useState(""),
    [type, setType] = useState(""),
    [priority, setPriority] = useState(""),
    [team, setTeam] = useState(""),
    [layout, setLayout] = useState("list"),
    [page, setPage] = useState(1),
    [slaFilter, setSlaFilter] = useState(""),
    [sort, setSort] = useState("updated");
  let base = s.tickets.filter((t) =>
    view === "tasks"
      ? t.type === "TASK"
      : view === "tickets"
        ? t.type !== "TASK" &&
          (t.requester_id === s.current_user.id ||
            t.assignee_id === s.current_user.id)
        : t.type !== "TASK",
  );
  if (view === "reports")
    base = base.filter((t) => t.sla_hours !== null || t.deadline_at);
  const normalize = (text: string) =>
    text
      .replace(/[ي]/g, "ی")
      .replace(/[ك]/g, "ک")
      .replace(/\u200c/g, " ")
      .toLowerCase();
  const filtered = base
    .filter(
      (t) =>
        (!query ||
          normalize(
            t.subject + " " + t.type + "-" + t.number + " " + t.description,
          ).includes(normalize(query))) &&
        (!status || t.status === status) &&
        (!type || t.type === type) &&
        (!priority || t.priority === priority) &&
        (!team || t.team_id === team) &&
        (!slaFilter ||
          (slaFilter === "risk"
            ? sla(t, s.settings, now).tone === "warning"
            : sla(t, s.settings, now).tone === slaFilter)),
    )
    .sort((a, b) =>
      sort === "sla"
        ? (sla(a, s.settings, now).remaining ?? Infinity) -
          (sla(b, s.settings, now).remaining ?? Infinity)
        : b.updated_at.localeCompare(a.updated_at),
    );
  const pageCount = Math.max(1, Math.ceil(filtered.length / 8)),
    currentPage = Math.min(page, pageCount),
    shown = filtered.slice((currentPage - 1) * 8, currentPage * 8);
  function exportCSV() {
    const rows = [
      ["شناسه", "موضوع", "نوع", "وضعیت", "تیم", "SLA"],
      ...filtered.map((t) => [
        t.type + "-" + t.number,
        t.subject,
        TYPES[t.type],
        STATES[t.status],
        s.teams.find((x) => x.id === t.team_id)?.name || "",
        sla(t, s.settings, now).label,
      ]),
    ];
    const csv =
      "\uFEFF" +
      rows
        .map((row) =>
          row
            .map(
              (x) =>
                '"' +
                (/^[=+@-]/.test(x) ? "'" : "") +
                x.replace(/"/g, '""') +
                '"',
            )
            .join(","),
        )
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "rahkar-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <PageHeading
        title={
          {
            tickets: "درخواست‌های من",
            inbox: "صندوق تیم‌ها",
            tasks: "کارهای شخصی",
            reports: "پایش توافق سطح خدمت",
          }[view]!
        }
        description={
          {
            tickets: "درخواست‌های ثبت‌شده و کارهای تخصیص‌یافته به شما.",
            inbox: "درخواست‌ها را بر اساس تیم مقصد بررسی و پیگیری کنید.",
            tasks: "فهرست خصوصی کارهای شما؛ بدون محدودیت SLA.",
            reports: "بررسی مهلت رسیدگی و شناسایی درخواست‌های در معرض تأخیر.",
          }[view]!
        }
        action={
          view === "reports" ? (
            <button className="btn light" onClick={exportCSV}>
              <Download size={17} />
              خروجی CSV
            </button>
          ) : undefined
        }
      />
      {view === "reports" && <MetricCards tickets={base} s={s} now={now} />}
      <div className="card ticket-list">
        <div className="list-controls">
          <div className="list-tabs">
            <button
              className={!status ? "active" : ""}
              onClick={() => {
                setStatus("");
                setPage(1);
              }}
            >
              همه درخواست‌ها <span>{number(base.length)}</span>
            </button>
            <button
              className={status === "IN_PROGRESS" ? "active" : ""}
              onClick={() => {
                setStatus("IN_PROGRESS");
                setPage(1);
              }}
            >
              در حال انجام
            </button>
            <button
              className={status === "RESOLVED" ? "active" : ""}
              onClick={() => {
                setStatus("RESOLVED");
                setPage(1);
              }}
            >
              حل‌شده
            </button>
          </div>
          <div className="segmented">
            <button
              aria-label="نمای فهرست"
              className={layout === "list" ? "active" : ""}
              onClick={() => setLayout("list")}
            >
              <List size={18} />
            </button>
            <button
              aria-label="نمای کانبان"
              className={layout === "board" ? "active" : ""}
              onClick={() => setLayout("board")}
            >
              <Grid2X2 size={18} />
            </button>
          </div>
        </div>
        <div className="filter-row">
          <SlidersHorizontal size={17} />
          <select
            aria-label="فیلتر نوع درخواست"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">همه انواع</option>
            {Object.entries(TYPES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            aria-label="فیلتر اولویت"
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(1);
            }}
          >
            <option value="">همه اولویت‌ها</option>
            {Object.entries(PRIORITIES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            aria-label="فیلتر تیم"
            value={team}
            onChange={(e) => {
              setTeam(e.target.value);
              setPage(1);
            }}
          >
            <option value="">همه تیم‌ها</option>
            {s.teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <select
            aria-label="فیلتر وضعیت"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(STATES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          {view === "reports" && (
            <select
              aria-label="وضعیت SLA"
              value={slaFilter}
              onChange={(e) => {
                setSlaFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">همه SLAها</option>
              <option value="danger">خارج از مهلت</option>
              <option value="risk">نزدیک مهلت</option>
              <option value="success">در محدوده مجاز</option>
            </select>
          )}
          <select
            aria-label="مرتب‌سازی"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="updated">آخرین به‌روزرسانی</option>
            <option value="sla">نزدیک‌ترین SLA</option>
          </select>
        </div>
        {layout === "list" ? (
          <TicketTable tickets={shown} s={s} onOpen={onOpen} now={now} />
        ) : (
          <div className="kanban">
            {Object.entries(STATES).map(([key, label]) => (
              <section key={key}>
                <h3>
                  {label}
                  <span>
                    {number(filtered.filter((t) => t.status === key).length)}
                  </span>
                </h3>
                {filtered
                  .filter((t) => t.status === key)
                  .map((t) => (
                    <button
                      className="kanban-ticket"
                      key={t.id}
                      onClick={() => onOpen(t.id)}
                    >
                      <span>
                        <TypeIcon type={t.type} />
                        <bdi>{t.type + "-" + t.number}</bdi>
                      </span>
                      <b>{t.subject}</b>
                      <PriorityBadge priority={t.priority} />
                      <SLA ticket={t} s={s} now={now} />
                    </button>
                  ))}
                {!filtered.some((t) => t.status === key) && (
                  <p className="muted">درخواستی در این ستون نیست.</p>
                )}
              </section>
            ))}
          </div>
        )}
        <div className="pagination">
          <span>
            {number(filtered.length)} درخواست
            {layout === "list"
              ? " · صفحه " + number(currentPage) + " از " + number(pageCount)
              : ""}
          </span>
          {layout === "list" && (
            <div>
              <button
                className="btn small light"
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                قبلی
              </button>
              <span>{number(currentPage)}</span>
              <button
                className="btn small light"
                disabled={currentPage === pageCount}
                onClick={() => setPage(currentPage + 1)}
              >
                بعدی
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

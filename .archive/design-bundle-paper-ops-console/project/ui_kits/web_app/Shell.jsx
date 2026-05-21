/* eslint-disable */
// TAC Express — Sidebar + Topbar shell components

const { useState } = React;

const NAV_GROUPS = [
  { name: "Platform", items: [
    { id: "dashboard", label: "Dashboard", icon: "layout-dashboard", dot: true },
    { id: "analytics", label: "Analytics", icon: "bar-chart-3" },
  ]},
  { name: "Operations", items: [
    { id: "shipments",  label: "Shipments",  icon: "package" },
    { id: "manifests",  label: "Manifests",  icon: "clipboard-list" },
    { id: "scanning",   label: "Scanning",   icon: "scan-line" },
    { id: "inventory",  label: "Inventory",  icon: "boxes" },
    { id: "exceptions", label: "Exceptions", icon: "triangle-alert" },
  ]},
  { name: "Business", items: [
    { id: "finance",   label: "Finance",   icon: "wallet", badge: "2" },
    { id: "rates",     label: "Rate Cards", icon: "calculator" },
    { id: "customers", label: "Customers", icon: "users" },
    { id: "mgmt",      label: "Management", icon: "shield" },
  ]},
];

const FOOT_ITEMS = [
  { id: "notifications", label: "Notifications", icon: "bell" },
  { id: "settings",      label: "Settings",      icon: "settings" },
];

function Icon({ name, size = 16 }) {
  // Lucide is loaded globally; render a placeholder <i> that lucide.createIcons()
  // upgrades on each render via the Sidebar's effect.
  return React.createElement("i", { "data-lucide": name, style: { width: size, height: size } });
}

function Sidebar({ active, onNav }) {
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });
  return (
    <aside className="side">
      <div className="side-brand">
        <div className="col">
          <div className="wm"><span className="ink">TAC</span> <span className="ex">EXPRESS →</span></div>
          <div className="sub">Imphal // Prod</div>
        </div>
        <div className="collapse" title="Collapse"><Icon name="chevron-right" size={12}/></div>
      </div>

      <nav className="side-nav">
        {NAV_GROUPS.map(group => (
          <div key={group.name}>
            <div className="side-section">
              <span>// {group.name}</span>
              <span className="chev"><Icon name="chevron-down" size={12}/></span>
            </div>
            {group.items.map(it => (
              <div key={it.id}
                   className={"side-item" + (active === it.id ? " active" : "")}
                   onClick={() => onNav(it.id)}>
                <Icon name={it.icon} size={16}/>
                <span>{it.label}</span>
                {active === it.id && <span className="dot"/>}
                {it.badge && <span className="badge">{it.badge}</span>}
              </div>
            ))}
          </div>
        ))}
      </nav>

      <div className="side-foot">
        {FOOT_ITEMS.map(it => (
          <div key={it.id}
               className={"side-item" + (active === it.id ? " active" : "")}
               onClick={() => onNav(it.id)}>
            <Icon name={it.icon} size={16}/>
            <span>{it.label}</span>
            {active === it.id && <span className="dot"/>}
          </div>
        ))}
      </div>

      <div className="side-user">
        <div className="av">N</div>
        <div>
          <div className="nm">ADMIN</div>
          <div className="ro">Super Admin</div>
        </div>
        <div className="menu"><Icon name="menu" size={16}/></div>
      </div>
    </aside>
  );
}

function Topbar({ crumbs = [] }) {
  const [theme, setTheme] = useState("M");
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });
  return (
    <div className="top">
      <div className="crumb">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="sep">›</span>}
            {i === crumbs.length - 1 ? <b>{c}</b> : <span>{c}</span>}
          </React.Fragment>
        ))}
      </div>
      <div className="top-right">
        <div className="tb-search">
          <Icon name="search" size={14}/>
          <span className="kbd">⌘K</span>
        </div>
        <div className="theme-set">
          {["C","M","S"].map(t => (
            <button key={t} className={theme === t ? "on" : ""} onClick={() => setTheme(t)}>{t}</button>
          ))}
        </div>
        <div className="tb-btn"><Icon name="bell" size={16}/></div>
        <div className="tb-btn"><Icon name="moon" size={16}/></div>
        <div className="tb-btn" style={{background:"var(--tac-violet)",color:"#fff",borderColor:"var(--tac-violet-2)"}}>A</div>
      </div>
    </div>
  );
}

function Frame({ children }) {
  return (
    <div className="frame">
      <span className="tick tl"></span>
      <span className="tick br"></span>
      <div className="body">{children}</div>
    </div>
  );
}

function PageHead({ eyebrow, title, sub, actions }) {
  return (
    <div className="page-head">
      <div>
        <div className="page-eyebrow">{eyebrow}</div>
        <h1 className="page-title">{title}</h1>
        <div className="page-sub">{sub}</div>
      </div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
}

function Tabs({ items, value, onChange }) {
  return (
    <div className="row gap-8" style={{marginBottom: 16}}>
      {items.map(it => (
        <button key={it} className={"btn tab" + (value === it ? " on" : "")} onClick={() => onChange(it)}>{it}</button>
      ))}
    </div>
  );
}

function Badge({ children, kind = "" }) {
  return <span className={"bdg " + kind}>{children}</span>;
}

window.TAC = window.TAC || {};
Object.assign(window.TAC, { Icon, Sidebar, Topbar, Frame, PageHead, Tabs, Badge });

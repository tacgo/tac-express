/* eslint-disable */
// TAC Express — Additional pages

const { Icon, Frame, PageHead, Tabs, Badge } = window.TAC;
const { useState } = React;

// ============ ANALYTICS ============
function AnalyticsPage() {
  return (
    <Frame>
      <PageHead eyebrow="Business" title="Analytics" sub="Operations overview across all hubs"/>
      <div className="grid-3" style={{marginBottom:16}}>
        <div className="card violet-under"><div className="row gap-8 label"><Icon name="package" size={14}/>Total Shipments</div><div style={{font:"800 32px var(--font-display)", marginTop:10}}>4</div></div>
        <div className="card violet-under"><div className="row gap-8 label"><Icon name="indian-rupee" size={14}/>Total Revenue</div><div style={{font:"800 32px var(--font-display)", marginTop:10}}>₹2,361</div></div>
        <div className="card violet-under"><div className="row gap-8 label"><Icon name="check-circle-2" size={14}/>Delivered</div><div style={{font:"800 32px var(--font-display)", marginTop:10}}>0</div><div className="label" style={{marginTop:4}}>0% delivery rate</div></div>
      </div>
      <div className="grid-3" style={{marginBottom:16}}>
        <div className="card"><div className="row gap-8 label"><Icon name="plane" size={14}/>In Transit</div><div style={{font:"800 28px var(--font-display)", marginTop:10}}>0</div></div>
        <div className="card"><div className="row gap-8 label"><Icon name="triangle-alert" size={14}/>Open Exceptions</div><div style={{font:"800 28px var(--font-display)", marginTop:10}}>0</div><div className="label" style={{marginTop:4}}>All clear</div></div>
        <div className="card"><div className="row gap-8 label"><Icon name="clock" size={14}/>Avg Delivery Days</div><div style={{font:"800 28px var(--font-display)", marginTop:10}}>N/A</div></div>
      </div>
      <div className="grid-2">
        <div className="card with-ticks">
          <div className="label" style={{marginBottom:10}}>Shipment Trend · 30 days</div>
          <svg viewBox="0 0 360 120" style={{width:"100%"}}>
            <line x1="0" y1="100" x2="360" y2="100" stroke="var(--line)" strokeDasharray="2,3"/>
            <line x1="0" y1="60" x2="360" y2="60" stroke="var(--line)" strokeDasharray="2,3"/>
            <path d="M0 100 L260 100 L260 30 L360 30 L360 120 L0 120 Z" fill="var(--tac-violet-50)"/>
            <path d="M0 100 L260 100 L260 30 L360 30" stroke="var(--tac-violet)" strokeWidth="1.5" fill="none"/>
          </svg>
        </div>
        <div className="card with-ticks" style={{display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", textAlign:"center"}}>
          <div className="label" style={{alignSelf:"flex-start"}}>Revenue Trend · 6 months</div>
          <Icon name="wifi-off" size={28}/>
          <div className="label" style={{marginTop:8}}>Awaiting Signal</div>
          <div className="page-sub">2 · resumes at N ≥ 3</div>
        </div>
      </div>
    </Frame>
  );
}

// ============ INVENTORY ============
function InventoryPage() {
  const rows = [["Created / Pending",4],["In Transit",0],["Arrived at Hub",0],["Out for Delivery",0],["Exceptions",0]];
  return (
    <Frame>
      <PageHead eyebrow="Operations" title="Hub Inventory" sub="Live shipment count by hub (excludes Delivered / Cancelled / RTO)"
        actions={<button className="btn"><Icon name="refresh-cw" size={12}/> Refresh</button>}/>
      <div className="card with-ticks" style={{maxWidth:520}}>
        <div className="row" style={{justifyContent:"space-between", marginBottom:14}}>
          <div className="label" style={{color:"var(--fg-1)", letterSpacing:".1em", fontSize:13}}>NEW DELHI</div>
          <Badge>4 pcs</Badge>
        </div>
        {rows.map(([l,v]) => (
          <div key={l} className="row" style={{justifyContent:"space-between", padding:"10px 0", borderTop:"1px solid var(--line)"}}>
            <span className="mono" style={{textTransform:"uppercase", fontSize:11, letterSpacing:".1em", color:"var(--fg-3)"}}>{l}</span>
            <span style={{font:"700 14px var(--font-display)"}}>{v}</span>
          </div>
        ))}
      </div>
    </Frame>
  );
}

// ============ EXCEPTIONS ============
function ExceptionsPage() {
  return (
    <Frame>
      <PageHead eyebrow="Operations" title="Exceptions" sub="Shipment exceptions requiring attention"/>
      <table className="tbl">
        <thead><tr><th>AWB</th><th>Status</th><th>Sender</th><th>Receiver</th><th>Route</th></tr></thead>
        <tbody>
          <tr><td colSpan={5} style={{textAlign:"center", padding:"32px", color:"var(--fg-3)"}}>No exceptions — all clear</td></tr>
        </tbody>
      </table>
    </Frame>
  );
}

// ============ RATE CARDS ============
function RateCardsPage() {
  const rows = [
    ["GUWAHATI → IMPHAL","Priority","0–5","₹120","₹60","8%","₹30"],
    ["GUWAHATI → IMPHAL","Priority","5–∞","₹100","₹60","8%","₹30"],
    ["GUWAHATI → IMPHAL","Standard","0–5","₹80","₹40","6%","₹0"],
    ["GUWAHATI → IMPHAL","Standard","5–∞","₹65","₹40","6%","₹0"],
    ["IMPHAL → NEW DELHI","Priority","0–0.5","₹240","₹75","10%","₹50"],
    ["IMPHAL → NEW DELHI","Priority","0.5–1","₹220","₹75","10%","₹50"],
    ["IMPHAL → NEW DELHI","Standard","0–0.5","₹180","₹50","8%","₹0"],
  ];
  return (
    <Frame>
      <PageHead eyebrow="Business" title="Rate Cards" sub="Pricing rules per route, service level, and weight slab"
        actions={<button className="btn primary"><Icon name="plus" size={12}/> Add Rate Card</button>}/>
      <div className="row gap-12" style={{marginBottom:14}}>
        <input className="field-input" style={{maxWidth:240}} placeholder="FILTER ORIGIN (E.G. IMPHA"/>
        <input className="field-input" style={{maxWidth:240}} placeholder="FILTER DESTINATION"/>
      </div>
      <table className="tbl">
        <thead><tr><th>Route</th><th>Service</th><th>Slab (kg)</th><th>Rate/kg</th><th>Docket</th><th>Fuel %</th><th>Handling</th><th></th></tr></thead>
        <tbody>
          {rows.map((r,i) => (
            <tr key={i}>
              <td className="mono" style={{textTransform:"uppercase", fontSize:12}}>{r[0]}</td>
              <td><Badge kind={r[1]==="Priority" ? "warn" : ""}>{r[1]}</Badge></td>
              <td className="mono">{r[2]}</td>
              <td className="mono">{r[3]}</td>
              <td className="mono">{r[4]}</td>
              <td className="mono">{r[5]}</td>
              <td className="mono">{r[6]}</td>
              <td><button className="btn sm danger">Deactivate</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Frame>
  );
}

// ============ CUSTOMERS ============
function CustomersPage() {
  const rows = [
    { name:"Big Poppa", email:"mail@bigpoppa.in", phone:"9541256321", loc:"Imphal", state:"Manipur", ship:0, rev:"₹0", out:"₹0" },
    { name:"Saso", email:"info@mjm.com", phone:"9558562145", loc:"New Delhi", state:"Delhi", ship:0, rev:"₹0", out:"₹0" },
  ];
  return (
    <Frame>
      <PageHead eyebrow="Business" title="Customers" sub="2 total customers"
        actions={<button className="btn primary"><Icon name="plus" size={12}/> New Customer</button>}/>
      <input className="field-input" style={{marginBottom:14}} placeholder="🔍 SEARCH.DB(NAME, PHONE, EMAIL)..."/>
      <div className="row" style={{justifyContent:"space-between", marginBottom:14}}>
        <button className="btn">Filter Customers</button>
        <span className="label">2 results</span>
      </div>
      <table className="tbl">
        <thead><tr><th>Name</th><th>Phone</th><th>Location</th><th>GSTIN</th><th>Shipments</th><th>Revenue</th><th>Outstanding</th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.name}>
              <td><div style={{fontWeight:600, textTransform:"uppercase", fontFamily:"var(--font-mono)", fontSize:12}}>{r.name}</div><div className="mono" style={{fontSize:11, color:"var(--fg-3)"}}>{r.email}</div></td>
              <td className="mono">{r.phone}</td>
              <td><div>{r.loc}</div><div className="mono" style={{fontSize:11, color:"var(--fg-3)"}}>{r.state}</div></td>
              <td className="mono" style={{color:"var(--fg-3)"}}>—</td>
              <td className="mono">{r.ship}</td>
              <td className="mono">{r.rev}</td>
              <td className="mono">{r.out}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Frame>
  );
}

// ============ MANAGEMENT ============
function ManagementPage() {
  const [tab, setTab] = useState("Staff");
  return (
    <Frame>
      <PageHead eyebrow="Administration" title="Operations & Access" sub="Staff, hubs, tariffs, and role-based permissions in one place."
        actions={<button className="btn primary"><Icon name="user-plus" size={12}/> Invite Staff</button>}/>
      <Tabs items={["Staff","Hubs","Tariffs","Permissions"]} value={tab} onChange={setTab}/>
      <div className="grid-4" style={{marginBottom:16}}>
        {[["Total Staff",1],["Active",1],["Inactive",0],["Hubs Covered",0]].map(([l,v]) => (
          <div key={l} className="card"><div className="label">{l}</div><div style={{font:"800 32px var(--font-display)", marginTop:8}}>{v}</div></div>
        ))}
      </div>
      <table className="tbl">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Hub</th><th>Status</th></tr></thead>
        <tbody>
          <tr>
            <td className="mono" style={{fontWeight:700, textTransform:"uppercase"}}>ADMIN</td>
            <td className="mono">admin@tac.app</td>
            <td><select className="field-select" style={{width:160, padding:"6px 10px"}}><option>SUPER_ADMIN</option><option>OPERATOR</option></select></td>
            <td className="mono" style={{color:"var(--fg-3)"}}>—</td>
            <td><Badge kind="violet">Active</Badge></td>
          </tr>
        </tbody>
      </table>
    </Frame>
  );
}

// ============ NOTIFICATIONS ============
function NotificationsPage() {
  const [tab, setTab] = useState("Unread");
  const channels = [
    {k:"SYSTEM",   t:"System",     d:"Platform alerts, scheduled jobs, sync state"},
    {k:"OPS",      t:"Operations", d:"Manifests, scans, dispatch, exceptions"},
    {k:"FINANCE",  t:"Finance",    d:"Invoices, payments, COD, settlement"},
    {k:"CUSTOMER", t:"Customer",   d:"Customer-initiated bookings + WhatsApp replies"},
    {k:"SLA",      t:"SLA",        d:"Breach warnings, due-soon alerts, escalations"},
  ];
  return (
    <Frame>
      <PageHead eyebrow="System" title="Notifications" sub="System alerts and activity updates"/>
      <div style={{display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:18}}>
        <div>
          <div className="row" style={{justifyContent:"space-between", marginBottom:8}}>
            <div><div style={{font:"700 16px var(--font-display)"}}>Inbox</div><div className="label">0 Total · 0 Unread</div></div>
          </div>
          <Tabs items={["Unread","All"]} value={tab} onChange={setTab}/>
          <div className="card with-ticks" style={{minHeight:220, display:"grid", placeItems:"center", textAlign:"center"}}>
            <div>
              <Icon name="bell" size={28}/>
              <div className="label" style={{marginTop:8}}>No Data</div>
              <div style={{font:"700 16px var(--font-display)", marginTop:4}}>No notifications yet</div>
              <div className="page-sub">We'll surface alerts and shipment events here as they arrive.</div>
            </div>
          </div>
        </div>
        <div style={{display:"flex", flexDirection:"column", gap:14}}>
          <div className="card with-ticks">
            <div className="row gap-8 label"><Icon name="radio" size={14}/>System Status</div>
            <div className="row gap-8" style={{marginTop:10, marginBottom:8}}><span style={{width:6,height:6,background:"var(--ok)"}}/><span className="label" style={{color:"var(--ok)", letterSpacing:".12em"}}>All Systems Normal</span></div>
            {["API","Database","Realtime","PDF Service","Webhooks"].map(s => (
              <div key={s} className="row" style={{justifyContent:"space-between", padding:"6px 0", borderTop:"1px solid var(--line)"}}>
                <span className="mono" style={{fontSize:11, textTransform:"uppercase", color:"var(--fg-3)", letterSpacing:".1em"}}>{s}</span>
                <span className="mono" style={{fontSize:11, color:"var(--ok)"}}>● Operational</span>
              </div>
            ))}
          </div>
          <div className="card with-ticks">
            <div className="row gap-8 label"><Icon name="info" size={14}/>Notification Channels</div>
            <div style={{marginTop:10, display:"flex", flexDirection:"column", gap:10}}>
              {channels.map(c => (
                <div key={c.k} className="row gap-12" style={{alignItems:"flex-start"}}>
                  <span className="bdg" style={{minWidth:74, justifyContent:"center"}}>{c.k}</span>
                  <div><div style={{font:"600 12px var(--font-mono)", letterSpacing:".06em", textTransform:"uppercase"}}>{c.t}</div><div className="page-sub" style={{marginTop:2}}>{c.d}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Frame>
  );
}

// ============ SETTINGS ============
function SettingsPage() {
  const [tab, setTab] = useState("Profile");
  return (
    <Frame>
      <PageHead eyebrow="Account" title="Settings" sub="Manage your profile, security, theme, and integrations"/>
      <Tabs items={["Profile","Security","Theme","Integrations","Audit"]} value={tab} onChange={setTab}/>
      <div style={{display:"grid", gridTemplateColumns:"1.5fr 1fr", gap:18}}>
        <div className="card with-ticks">
          <div className="label" style={{marginBottom:14}}>Profile</div>
          <div style={{display:"flex", flexDirection:"column", gap:14}}>
            <div><label className="field-label">Email</label><input className="field-input" defaultValue="ADMIN@TAC.APP"/></div>
            <div><label className="field-label">Display Name</label><input className="field-input" placeholder="Type your name"/></div>
            <div><label className="field-label">Hub Code</label><input className="field-input" placeholder="E.G. IMPHAL"/></div>
            <div className="row" style={{justifyContent:"flex-end", marginTop:6}}><button className="btn primary">Save Changes</button></div>
          </div>
        </div>
        <div style={{display:"flex", flexDirection:"column", gap:14}}>
          <div className="card with-ticks">
            <div className="label">Profile Completion</div>
            <div style={{font:"800 28px var(--font-display)", marginTop:8}}>0%</div>
            <div className="label" style={{marginTop:6}}>2 pending</div>
            <div style={{marginTop:10, fontSize:12, fontFamily:"var(--font-mono)", color:"var(--fg-3)"}}>
              <div>■ Display name</div><div>■ Hub code</div>
            </div>
          </div>
          <div className="card with-ticks">
            <div className="row gap-8 label"><Icon name="keyboard" size={14}/>Keyboard Shortcuts</div>
            {[["Open search","⌘ K"],["Toggle theme","⌘ ⇧ L"],["Notifications","⌘ ⇧ N"],["Sign out","⌘ ⇧ Q"]].map(([l,k]) => (
              <div key={l} className="row" style={{justifyContent:"space-between", marginTop:8}}>
                <span className="mono" style={{fontSize:11, textTransform:"uppercase", color:"var(--fg-3)", letterSpacing:".08em"}}>{l}</span>
                <span className="mono" style={{fontSize:11}}>{k.split(" ").map((x,i)=><span key={i} className="kbd" style={{marginLeft:3}}>{x}</span>)}</span>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="label">System Information</div>
            <div className="row" style={{justifyContent:"space-between", marginTop:8}}><span className="label">Version</span><span className="mono">TAC Express v1.0</span></div>
            <div className="row" style={{justifyContent:"space-between", marginTop:6}}><span className="label">Environment</span><span className="mono">development</span></div>
          </div>
        </div>
      </div>
    </Frame>
  );
}

Object.assign(window.TAC.pages, { AnalyticsPage, InventoryPage, ExceptionsPage, RateCardsPage, CustomersPage, ManagementPage, NotificationsPage, SettingsPage });

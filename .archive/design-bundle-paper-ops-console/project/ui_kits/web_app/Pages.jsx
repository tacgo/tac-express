/* eslint-disable */
// TAC Express — Page screens

const { Icon, Frame, PageHead, Tabs, Badge } = window.TAC;
const { useState } = React;

// ============ DASHBOARD ============
function DashboardPage() {
  return (
    <Frame>
      <PageHead eyebrow="Platform" title="Dashboard" sub="Real-time operations overview across the network"/>

      <div className="card no-pad" style={{overflow:"hidden", marginBottom: 20, position:"relative", background:"linear-gradient(110deg,#cdd6c5 0%, #a8b1a4 100%)", height: 200}}>
        <div style={{position:"absolute", inset:0, background:"radial-gradient(ellipse at 75% 60%, rgba(0,0,0,0.15), transparent 60%)"}}/>
        <svg viewBox="0 0 800 200" preserveAspectRatio="xMidYMid slice" style={{position:"absolute", inset:0, width:"100%", height:"100%"}}>
          <defs>
            <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#dde2da"/><stop offset="1" stopColor="#a3aea0"/>
            </linearGradient>
          </defs>
          <rect width="800" height="200" fill="url(#sky)"/>
          <path d="M0 130 L120 110 L220 130 L340 95 L460 120 L580 90 L700 110 L800 95 L800 200 L0 200 Z" fill="#7a8b78" opacity=".7"/>
          <path d="M0 150 L150 135 L300 155 L450 125 L620 145 L800 130 L800 200 L0 200 Z" fill="#5a6c5a" opacity=".8"/>
          <path d="M0 175 L800 160 L800 200 L0 200 Z" fill="#3d4d40"/>
          <path d="M0 175 Q200 168 400 178 T800 170" stroke="#2a3530" strokeWidth="3" fill="none"/>
          <rect x="540" y="148" width="60" height="22" fill="#2a3530" rx="2"/>
          <rect x="600" y="156" width="14" height="14" fill="#7ce58c" opacity=".8"/>
        </svg>
        <div style={{position:"absolute", top:16, right:16, background:"#fff", border:"1px solid var(--line)", padding:"5px 10px", borderRadius:"var(--r-1)", font:"500 10px var(--font-mono)", letterSpacing:".1em"}}>DISPATCH · LIVE</div>
        <div style={{position:"absolute", left:24, bottom:20, color:"#fff"}}>
          <div style={{font:"500 10px var(--font-mono)", letterSpacing:".18em", color:"var(--tac-violet-50)"}}>TAC EXPRESS · NETWORK</div>
          <div style={{font:"800 26px var(--font-display)", marginTop:4}}>Welcome back, Operator</div>
          <div style={{font:"400 13px var(--font-body)", opacity:.85, marginTop:3}}>Live shipment, manifest, and SLA telemetry across every hub.</div>
        </div>
      </div>

      <div className="grid-4" style={{marginBottom: 16}}>
        <StatCard icon="bar-chart-3" label="Active Shipments" value="4"/>
        <StatCard icon="truck" label="In Transit" value="0"/>
        <StatCard icon="triangle-alert" label="Open Exceptions" value="0"/>
        <div className="card">
          <div className="label" style={{marginBottom:10}}>Command Center</div>
          <div className="row gap-8">
            <button className="btn primary" style={{flex:1, justifyContent:"center"}}>+ Shipment</button>
            <button className="btn" style={{flex:1, justifyContent:"center"}}>+ Manifest</button>
          </div>
        </div>
      </div>

      <div className="grid-3">
        <div className="card with-ticks">
          <div className="row" style={{justifyContent:"space-between"}}>
            <div className="label" style={{fontSize:13, textTransform:"none", letterSpacing:0, color:"var(--fg-1)", fontWeight:600}}>Growth</div>
            <span className="bdg">6 months</span>
          </div>
          <div style={{display:"flex", justifyContent:"space-between", marginTop:18, alignItems:"flex-end"}}>
            <div className="label">Delivery success</div><div className="label">Target 85%</div>
          </div>
          <div style={{font:"800 32px var(--font-display)", margin:"6px 0 10px"}}>0%</div>
          <div style={{height:6, background:"var(--paper-2)", borderRadius:2, overflow:"hidden"}}>
            <div style={{width:"0%", height:"100%", background:"var(--tac-violet)"}}/>
          </div>
          <div className="label" style={{marginTop:8}}>0 of 4 delivered</div>
        </div>

        <div className="card with-ticks">
          <div className="row" style={{justifyContent:"space-between"}}>
            <div style={{font:"600 13px var(--font-display)"}}>Shipment Volume</div>
            <span className="bdg">30 days</span>
          </div>
          <svg viewBox="0 0 360 120" style={{width:"100%", marginTop:12}}>
            <line x1="0" y1="100" x2="360" y2="100" stroke="var(--line)" strokeDasharray="2,3"/>
            <line x1="0" y1="60" x2="360" y2="60" stroke="var(--line)" strokeDasharray="2,3"/>
            <line x1="0" y1="20" x2="360" y2="20" stroke="var(--line)" strokeDasharray="2,3"/>
            <path d="M0 100 L260 100 L260 30 L360 30 L360 120 L0 120 Z" fill="var(--tac-violet-50)"/>
            <path d="M0 100 L260 100 L260 30 L360 30" stroke="var(--tac-violet)" strokeWidth="1.5" fill="none"/>
            <text x="0"   y="115" font-family="JetBrains Mono" font-size="8" fill="#6F6B5E">22 Apr</text>
            <text x="160" y="115" font-family="JetBrains Mono" font-size="8" fill="#6F6B5E">30 Apr</text>
            <text x="320" y="115" font-family="JetBrains Mono" font-size="8" fill="#6F6B5E">6 May</text>
          </svg>
        </div>

        <div className="card with-ticks">
          <div className="row" style={{justifyContent:"space-between"}}>
            <div style={{font:"600 13px var(--font-display)"}}>Upcoming Operations</div>
            <button className="btn sm" style={{background:"#0E0F12", color:"#fff", borderColor:"#0E0F12"}}>View all</button>
          </div>
          <div className="page-sub" style={{marginTop:10}}>Scheduled manifests by departure date</div>
          <div className="label" style={{marginTop:18}}>No scheduled departures</div>
        </div>
      </div>
    </Frame>
  );
}

function StatCard({ icon, label, value }) {
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });
  return (
    <div className="card violet-under">
      <div className="row gap-8 label"><Icon name={icon} size={14}/><span>{label}</span></div>
      <div style={{font:"800 32px var(--font-display)", margin:"10px 0 0"}}>{value}</div>
      <div className="row" style={{justifyContent:"flex-end", marginTop:6}}>
        <div className="tb-btn" style={{width:24, height:24}}><Icon name="arrow-up-right" size={12}/></div>
      </div>
    </div>
  );
}

// ============ SHIPMENTS ============
function ShipmentsPage() {
  const [tab, setTab] = useState("All");
  const rows = [
    { id: "TAC26050610015", cust: "Apple LLC", to: "MIKO YOO", route: "IMF → DEL", svc: "STD", w: "5.5kg", st: "Created", age: "2 days ago" },
    { id: "TAC26050610014", cust: "Apple LLC", to: "MIKO YOO", route: "IMF → DEL", svc: "STD", w: "5.5kg", st: "Created", age: "2 days ago" },
    { id: "TAC26043010002", cust: "Micky Sam", to: "KID DEE",  route: "IMF → DEL", svc: "STD", w: "5.0kg", st: "Created", age: "9 days ago" },
    { id: "TAC26042210001", cust: "John Lee",  to: "MACK LEE", route: "IMF → DEL", svc: "STD", w: "5.0kg", st: "Created", age: "17 days ago" },
  ];
  return (
    <Frame>
      <PageHead eyebrow="Operations" title="Shipments" sub="All shipments — search, filter, and manage"
        actions={<button className="btn primary"><Icon name="plus" size={12}/> New Shipment</button>}/>
      <Tabs items={["All","Created","In Transit","Out for Delivery","Delivered","Exception"]} value={tab} onChange={setTab}/>
      <div style={{marginBottom:14, maxWidth:520}}>
        <input className="field-input" placeholder="SEARCH AWB, SENDER, RECEIVER.."/>
      </div>
      <table className="tbl">
        <thead><tr>
          <th>CN Number</th><th>Customer</th><th>Route</th><th>Service</th><th>Pkgs · Weight</th><th>Status</th><th>Created</th><th></th>
        </tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td><span className="row gap-8"><Icon name="package" size={14}/><span className="id">{r.id}</span></span></td>
              <td><div style={{fontWeight:600,fontSize:13}}>{r.cust}</div><div className="mono">→ {r.to}</div></td>
              <td className="mono">{r.route}</td>
              <td><Badge>🚚 {r.svc}</Badge></td>
              <td className="mono">1 · {r.w}</td>
              <td><Badge>{r.st}</Badge></td>
              <td className="mono" style={{color:"var(--fg-3)"}}>{r.age}</td>
              <td><button className="btn sm">View</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row" style={{justifyContent:"space-between", marginTop:14}}>
        <div className="label">Page 1 of 1</div>
        <div className="row gap-8">
          <button className="btn sm">‹</button><button className="btn sm">›</button>
        </div>
      </div>
    </Frame>
  );
}

// ============ MANIFESTS ============
function ManifestsPage() {
  const [tab, setTab] = useState("All");
  const items = [
    { id: "MAN2604300002", from:"IMPHAL", to:"NEW_DELHI", ship:0, w:"0.0", date:"30 Apr", st:"Draft" },
    { id: "MAN2604220001", from:"IMPHAL", to:"NEW_DELHI", ship:0, w:"0.0", date:"22 Apr", st:"Draft" },
  ];
  return (
    <Frame>
      <PageHead eyebrow="Operations" title="Manifests" sub="Transit manifests — create, build, depart and receive"
        actions={<button className="btn primary"><Icon name="plus" size={12}/> New Manifest</button>}/>
      <Tabs items={["All","Draft","Building","Open","Closed","Departed","Arrived"]} value={tab} onChange={setTab}/>
      <div className="grid-2">
        {items.map(m => (
          <div key={m.id} className="card with-ticks">
            <div className="row" style={{justifyContent:"space-between", marginBottom:8}}>
              <span className="id" style={{fontSize:14}}>{m.id}</span>
              <Badge>{m.st}</Badge>
            </div>
            <div className="mono" style={{fontSize:12, color:"var(--fg-3)"}}>{m.from} → {m.to}</div>
            <div className="row" style={{justifyContent:"space-between", marginTop:18, paddingTop:14, borderTop:"1px solid var(--line)"}}>
              <div><div className="label">Shipments</div><div style={{font:"700 18px var(--font-display)"}}>{m.ship}</div></div>
              <div><div className="label">Weight</div><div style={{font:"700 18px var(--font-display)"}}>{m.w} kg</div></div>
              <div style={{textAlign:"right"}}><div className="label">Created</div><div className="mono" style={{fontSize:13}}>{m.date}</div></div>
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

// ============ SCANNING ============
function ScanningPage() {
  const [mode, setMode] = useState("Receive");
  return (
    <Frame>
      <PageHead eyebrow="Operations" title="Scanning" sub="Scan AWBs and manifests — works offline with auto-sync"/>
      <div className="row" style={{justifyContent:"space-between", marginBottom:14}}>
        <div className="row gap-12">
          <span style={{width:8,height:8,background:"var(--tac-violet)"}}/>
          <div>
            <div className="label">Hub Operations Console</div>
            <div style={{font:"700 18px var(--font-display)", marginTop:2}}>Receive <span className="mono" style={{color:"var(--fg-3)", fontSize:12, fontWeight:400, marginLeft:6}}>· INBOUND AT HUB</span></div>
          </div>
        </div>
        <div className="row gap-8">
          <span className="bdg">Total 0</span>
          <span className="bdg">OK 0</span>
          <span className="bdg">Err 0</span>
          <span className="bdg">Rate 0%</span>
          <button className="tb-btn"><Icon name="settings" size={14}/></button>
        </div>
      </div>
      <div className="grid-4" style={{marginBottom:14}}>
        {["Receive","Load Manifest","Verify Manifest","Deliver"].map(m => (
          <button key={m} className={"btn " + (mode === m ? "primary" : "")} style={{justifyContent:"center", padding:"12px"}} onClick={() => setMode(m)}>
            <Icon name={m === "Deliver" ? "check-circle-2" : m === "Receive" ? "package" : "clipboard-list"} size={14}/> {m}
          </button>
        ))}
      </div>
      <div style={{display:"grid", gridTemplateColumns:"1.6fr 1fr", gap:16}}>
        <div>
          <div className="row gap-8" style={{marginBottom:8}}>
            <button className="btn"><Icon name="grid-2x2" size={14}/> Manual</button>
            <button className="btn"><Icon name="camera" size={14}/> Camera</button>
          </div>
          <div className="label" style={{marginBottom:6}}>Scan or type AWB and press enter</div>
          <input className="field-input" placeholder="TAC..."/>
        </div>
        <div className="card with-ticks" style={{minHeight:240, display:"flex", flexDirection:"column"}}>
          <div className="label">Scan Feed · Last 100</div>
          <div style={{flex:1, display:"grid", placeItems:"center", textAlign:"center", color:"var(--fg-3)"}}>
            <div>
              <div className="label" style={{marginBottom:6}}>Awaiting Scans…</div>
              <div className="page-sub">Use the scanner or type an AWB to begin.</div>
            </div>
          </div>
        </div>
      </div>
      <div className="row" style={{justifyContent:"space-between", marginTop:14, color:"var(--fg-3)", font:"500 11px var(--font-mono)", letterSpacing:".1em"}}>
        <span>📡 ONLINE · PENDING SYNC: 0 · FAILED: 0</span>
        <span><Icon name="clock" size={12}/> SESSION 00:04</span>
      </div>
    </Frame>
  );
}

// ============ FINANCE ============
function FinancePage() {
  const [tab, setTab] = useState("All");
  const rows = [
    { id:"INV-2026-01020", cust:"Tapan Cargo", st:"Cancelled", amt:"₹1,010", k:"" },
    { id:"INV-2026-01019", cust:"Mad Max", st:"Paid", amt:"₹773", k:"ok" },
    { id:"INV-2026-01018", cust:"George Mee", st:"Draft", amt:"₹1,129.5", k:"warn" },
    { id:"INV-2026-01017", cust:"Saso", st:"Draft", amt:"₹798", k:"warn" },
    { id:"INV-2026-01016", cust:"Big Poppa", st:"Issued", amt:"₹1,346", k:"violet" },
    { id:"INV-2026-01015", cust:"Big Poppa", st:"Draft", amt:"₹2,419", k:"warn" },
  ];
  return (
    <Frame>
      <PageHead eyebrow="Business" title="Finance" sub="Invoices, billing and financial reports"
        actions={<button className="btn primary"><Icon name="plus" size={12}/> New Invoice</button>}/>
      <div className="card with-ticks" style={{marginBottom:18}}>
        <div className="row" style={{justifyContent:"space-between"}}>
          <div className="row gap-8">
            <span style={{width:6,height:14,background:"var(--err)"}}/>
            <div className="label" style={{color:"var(--fg-1)", letterSpacing:".08em"}}>Receivables Aging · 10 invoices</div>
          </div>
          <div className="row gap-8"><span className="label">Outstanding</span><b style={{color:"var(--err)", font:"700 16px var(--font-display)"}}>₹13,771</b></div>
        </div>
        <div className="grid-4" style={{marginTop:14}}>
          {[{l:"Current", v:"₹0", s:"0 invoices", c:"var(--ok)"},
            {l:"0–30 days", v:"₹13,771", s:"7 invoices · 100%", c:"var(--warn)"},
            {l:"31–60 days", v:"₹0", s:"0 invoices", c:"var(--fg-3)"},
            {l:"61–90 days", v:"₹0", s:"0 invoices", c:"var(--fg-3)"}].map((b,i) => (
            <div key={i} style={{padding:"10px 14px", borderLeft:`3px solid ${b.c}`, background:"var(--paper-2)", borderRadius:"var(--r-1)"}}>
              <div className="label">{b.l}</div>
              <div style={{font:"700 22px var(--font-display)", marginTop:4, color:b.c}}>{b.v}</div>
              <div className="mono" style={{fontSize:11, color:"var(--fg-3)", marginTop:2}}>{b.s}</div>
            </div>
          ))}
        </div>
      </div>
      <Tabs items={["All","Draft","Issued","Paid","Overdue"]} value={tab} onChange={setTab}/>
      <table className="tbl">
        <thead><tr><th>Invoice #</th><th>Customer</th><th>Status</th><th>Amount</th><th>Due</th><th></th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td><span className="id">{r.id}</span></td>
              <td>{r.cust}</td>
              <td><Badge kind={r.k}>{r.st}</Badge></td>
              <td className="mono">{r.amt}</td>
              <td className="mono" style={{color:"var(--fg-3)"}}>—</td>
              <td><button className="btn sm">View</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Frame>
  );
}

window.TAC.pages = { DashboardPage, ShipmentsPage, ManifestsPage, ScanningPage, FinancePage };

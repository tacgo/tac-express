import {
  RiSearchLine,
  RiArrowDownSLine,
  RiArrowRightUpLine,
  RiTruckLine,
  RiFlightTakeoffLine,
  RiBox3Line,
  RiAlertLine,
  RiCheckboxCircleLine,
} from "@workspace/ui/icons"

/**
 * V8 overview — content only. The shared shell (sidebar + topbar), scope, and
 * fonts come from the segment layout (layout.tsx + v8-chrome.tsx), so this page
 * and the invoice workflow render inside one navigable v8 dashboard.
 */

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n)

const VOLUME = [
  38, 52, 44, 61, 49, 72, 58, 80, 66, 90, 74, 96, 62, 85, 70, 99, 58, 77,
]
const WEEK = [40, 55, 48, 62, 80, 35, 28]
const PENDING = [
  {
    code: "TAC1000482",
    label: "Air cargo · DEL → BLR",
    qty: "12 pcs",
    val: 56095,
    tone: "info",
  },
  {
    code: "TAC1000479",
    label: "Road freight · BOM → CCU",
    qty: "8 pcs",
    val: 34200,
    tone: "muted",
  },
  {
    code: "TAC1000471",
    label: "Air cargo · MAA → IMF",
    qty: "3 pcs",
    val: 89200,
    tone: "positive",
  },
  {
    code: "TAC1000465",
    label: "Road freight · GAU → HYD",
    qty: "21 pcs",
    val: 8450,
    tone: "danger",
  },
]

function Spark() {
  const max = Math.max(...VOLUME)
  const pts = VOLUME.map(
    (v, i) => `${(i / (VOLUME.length - 1)) * 100},${40 - (v / max) * 36}`
  ).join(" ")
  return (
    <svg
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      className="h-16 w-full"
    >
      <polyline
        points={pts}
        fill="none"
        stroke="var(--v8-positive)"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

function Bars({ data, accentIndex }: { data: number[]; accentIndex?: number }) {
  const max = Math.max(...data)
  return (
    <div className="flex h-28 items-end gap-1.5">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-[4px]"
          style={{
            height: `${(v / max) * 100}%`,
            background:
              i === accentIndex ? "var(--v8-positive)" : "var(--v8-ink)",
            opacity: i === accentIndex ? 1 : 0.12,
          }}
        />
      ))}
    </div>
  )
}

export default function V8OverviewPage() {
  return (
    <div className="v8-container">
      {/* Hero */}
      <div className="flex flex-wrap items-end justify-between gap-4 py-6">
        <div>
          <div className="v8-caption mb-1.5">Home · Operations</div>
          <h1 className="v8-display">Operations Overview</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="v8-icon-btn" aria-label="Search">
            <RiSearchLine className="size-5" />
          </span>
          <span className="v8-pill">
            20 – 27 Jan, 2026 <RiArrowDownSLine className="size-4" />
          </span>
        </div>
      </div>

      {/* Bento grid */}
      <div className="v8-grid">
        <section
          className="v8-card"
          data-hover="true"
          style={{ gridColumn: "span 4" }}
        >
          <div className="v8-caption">Total Cargo Revenue</div>
          <div className="v8-metric mt-2" style={{ fontSize: "2.25rem" }}>
            {inr(9567845)}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="v8-kpi-badge">+7.5%</span>
            <span className="v8-caption">vs last month</span>
          </div>
          <div className="mt-4">
            <Spark />
          </div>
        </section>

        <section
          className="v8-card"
          data-hover="true"
          style={{ gridColumn: "span 5" }}
        >
          <div className="flex items-start justify-between">
            <div>
              <h2 className="v8-h2">Shipment Volume</h2>
              <div className="v8-caption mt-0.5">Jan 1 – Sep 13, 2026</div>
            </div>
            <span
              className="v8-icon-btn"
              style={{ width: 36, height: 36 }}
              aria-label="Expand"
            >
              <RiArrowRightUpLine className="size-4" />
            </span>
          </div>
          <div className="mt-5">
            <Bars data={VOLUME} accentIndex={11} />
          </div>
          <div className="v8-micro mt-3 flex items-center justify-between">
            <span>Jan</span>
            <span>Mar</span>
            <span>May</span>
            <span>Jul</span>
            <span>Sep</span>
          </div>
        </section>

        <section
          className="v8-card"
          data-hover="true"
          style={{ gridColumn: "span 3" }}
        >
          <div className="v8-caption">Active Shipments</div>
          <div className="v8-metric mt-2" style={{ fontSize: "2.25rem" }}>
            21,120
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="v8-kpi-badge">+156</span>
            <span className="v8-caption">this week</span>
          </div>
          <div className="mt-4">
            <Bars data={WEEK} accentIndex={4} />
          </div>
        </section>

        <section className="v8-card" style={{ gridColumn: "span 8" }}>
          <h2 className="v8-h2">Delivery Performance</h2>
          <div className="v8-caption mt-0.5">
            Processing activity across channels
          </div>
          <div className="mt-5 flex flex-wrap gap-10">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="v8-avatar"
                  style={{
                    width: 32,
                    height: 32,
                    background: "var(--v8-positive)",
                  }}
                >
                  <RiTruckLine className="size-4" />
                </span>
                <span
                  className="v8-caption"
                  style={{ color: "var(--v8-text)" }}
                >
                  Road freight
                </span>
              </div>
              <div className="v8-metric mt-2" style={{ fontSize: "1.75rem" }}>
                {inr(3720100)}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="v8-avatar" style={{ width: 32, height: 32 }}>
                  <RiFlightTakeoffLine className="size-4" />
                </span>
                <span
                  className="v8-caption"
                  style={{ color: "var(--v8-text)" }}
                >
                  Air cargo
                </span>
              </div>
              <div className="v8-metric mt-2" style={{ fontSize: "1.75rem" }}>
                {inr(479900)}
              </div>
            </div>
          </div>
          <div className="mt-6">
            <Bars data={VOLUME.slice(0, 12)} accentIndex={8} />
          </div>
        </section>

        <section className="v8-card" style={{ gridColumn: "span 4" }}>
          <h2 className="v8-h2">Pending Deliveries</h2>
          <div className="v8-caption mt-0.5 mb-2">
            Awaiting dispatch or in transit
          </div>
          {PENDING.map((p, i) => (
            <div key={p.code}>
              {i > 0 && <hr className="v8-divider" />}
              <div className="v8-row">
                <span className="v8-avatar">
                  {p.tone === "danger" ? (
                    <RiAlertLine className="size-4" />
                  ) : p.tone === "positive" ? (
                    <RiCheckboxCircleLine className="size-4" />
                  ) : (
                    <RiBox3Line className="size-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="v8-metric" style={{ fontSize: "0.875rem" }}>
                    {p.code}
                  </div>
                  <div className="v8-caption truncate">{p.label}</div>
                </div>
                <div className="text-right">
                  <div className="v8-metric" style={{ fontSize: "0.875rem" }}>
                    {inr(p.val)}
                  </div>
                  <div className="v8-micro">{p.qty}</div>
                </div>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}

"use client"

import * as React from "react"
import { Marker, Source, Layer } from "react-map-gl/maplibre"

import { cn } from "@workspace/ui/lib/utils"
import { Badge } from "@workspace/ui/components/primitives/badge"
import { RiPlaneLine, RiTruckLine } from "@workspace/ui/icons"
import { useCssVars } from "@workspace/ui/hooks/use-css-vars"

import { MapLibreMap } from "./maplibre-map"

// MapLibre paint expressions need resolved color values (WebGL can't read
// CSS variables). These names are pulled from the design tokens at runtime
// so the map status palette always matches the active theme + brand violet.
const MAP_TOKEN_NAMES = [
  "--paper-err",
  "--paper-ok",
  "--paper-line-3",
  "--paper-violet",
] as const

export interface CorridorHub {
  code: string
  name: string
  longitude: number
  latitude: number
  /** Optional secondary label (e.g. shipment counts). */
  secondary?: string
  isActive?: boolean
}

export interface CorridorRoute {
  id: string
  fromCode: string
  toCode: string
  /** AIR draws as great-circle arc; TRUCK draws as straight line for now. */
  mode: "AIR" | "TRUCK"
  /** Number of in-flight shipments on this corridor. Drives line width. */
  shipments?: number
  /** Manifest status — IN_TRANSIT animates dashes, others fade. */
  status?: "OPEN" | "IN_TRANSIT" | "ARRIVED" | "EXCEPTION"
}

interface LiveCorridorMapProps {
  hubs: CorridorHub[]
  routes: CorridorRoute[]
  className?: string
}

const HUBS_FALLBACK: CorridorHub[] = [
  {
    code: "DEL",
    name: "New Delhi",
    longitude: 77.103,
    latitude: 28.5562,
    isActive: true,
  },
  {
    code: "IMF",
    name: "Imphal",
    longitude: 93.937,
    latitude: 24.7611,
    isActive: true,
  },
]

export function LiveCorridorMap({
  hubs,
  routes,
  className,
}: LiveCorridorMapProps) {
  const effectiveHubs = hubs.length > 0 ? hubs : HUBS_FALLBACK
  const hubByCode = React.useMemo(
    () => new Map(effectiveHubs.map((h) => [h.code, h])),
    [effectiveHubs]
  )

  // Resolve design tokens for the MapLibre paint expressions. Re-resolves
  // on theme switches via the MutationObserver inside useCssVars.
  const tokens = useCssVars(MAP_TOKEN_NAMES)

  // Build a single GeoJSON FeatureCollection for all routes — drawing in one
  // Source is dramatically cheaper than one Source per route.
  const routesGeoJson = React.useMemo(() => {
    const features = routes
      .map((r) => {
        const a = hubByCode.get(r.fromCode)
        const b = hubByCode.get(r.toCode)
        if (!a || !b) return null
        return {
          type: "Feature" as const,
          properties: {
            id: r.id,
            mode: r.mode,
            status: r.status ?? "IN_TRANSIT",
            shipments: r.shipments ?? 1,
          },
          geometry: greatCircleLine(
            [a.longitude, a.latitude],
            [b.longitude, b.latitude],
            r.mode === "AIR" ? 64 : 8
          ),
        }
      })
      .filter(Boolean)
    return {
      type: "FeatureCollection" as const,
      features: features as GeoJSON.Feature<GeoJSON.LineString>[],
    }
  }, [routes, hubByCode])

  return (
    <section
      data-slot="live-corridor-map"
      className={cn("space-y-2", className)}
    >
      <header className="flex items-center justify-between">
        <p className="font-mono text-paper-10 uppercase tracking-widest text-muted-foreground">
          Live Corridor Map
        </p>
        <p className="flex items-center gap-2 font-mono text-paper-10 uppercase tracking-widest text-muted-foreground">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping bg-primary/60 opacity-75" />
            <span className="relative inline-flex size-2 bg-primary" />
          </span>
          {routes.length} active corridor{routes.length === 1 ? "" : "s"}
        </p>
      </header>

      <MapLibreMap>
        <Source id="corridors" type="geojson" data={routesGeoJson}>
          {/* Base line */}
          <Layer
            id="corridor-line"
            type="line"
            layout={{ "line-cap": "round", "line-join": "round" }}
            paint={{
              "line-color": [
                "match",
                ["get", "status"],
                "EXCEPTION",
                tokens["--paper-err"],
                "ARRIVED",
                tokens["--paper-ok"],
                "OPEN",
                tokens["--paper-line-3"],
                /* default IN_TRANSIT */ tokens["--paper-violet"],
              ],
              "line-width": [
                "interpolate",
                ["linear"],
                ["get", "shipments"],
                1,
                1.5,
                10,
                3.2,
                50,
                4.4,
              ],
              "line-opacity": 0.85,
              "line-dasharray": [3, 1.5],
            }}
          />
        </Source>

        {/* Hub markers — DOM overlays, not Mapbox-style icons. Keeps the
            visual identity consistent with the rest of the dashboard. */}
        {effectiveHubs.map((h) => (
          <Marker
            key={h.code}
            longitude={h.longitude}
            latitude={h.latitude}
            anchor="bottom"
          >
            <HubPin
              code={h.code}
              name={h.name}
              secondary={h.secondary}
              isActive={h.isActive}
            />
          </Marker>
        ))}
      </MapLibreMap>

      <Legend />
    </section>
  )
}

function HubPin({
  code,
  name,
  secondary,
  isActive,
}: Pick<CorridorHub, "code" | "name" | "secondary" | "isActive">) {
  return (
    <div className="group/hub-pin relative flex flex-col items-center">
      <div className="pointer-events-none flex h-7 items-center gap-1.5 border border-primary/40 bg-background/95 px-2 font-mono text-paper-10 font-semibold uppercase tracking-widest text-foreground shadow-[var(--shadow-brutal-sm)]">
        <span
          className={cn(
            "size-1.5",
            isActive ? "bg-primary" : "bg-muted-foreground"
          )}
        />
        {code}
      </div>
      <div className="h-2 w-px bg-primary/50" />
      <div className="size-2 -translate-y-px rotate-45 border border-primary/70 bg-background" />
      <div className="pointer-events-none absolute -bottom-7 z-10 hidden whitespace-nowrap border border-border bg-popover px-2 py-0.5 font-mono text-paper-10 uppercase tracking-widest text-popover-foreground group-hover/hub-pin:block">
        {name}
        {secondary ? ` · ${secondary}` : ""}
      </div>
    </div>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-3 font-mono text-paper-10 uppercase tracking-widest text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <RiPlaneLine className="size-3" />
        Air
      </span>
      <span className="flex items-center gap-1.5">
        <RiTruckLine className="size-3" />
        Truck
      </span>
      <Badge variant="secondary" className="font-mono">
        In Transit
      </Badge>
      <Badge variant="outline" className="font-mono">
        Open
      </Badge>
      <Badge variant="destructive" className="font-mono">
        Exception
      </Badge>
    </div>
  )
}

// Great-circle interpolation between two longitude/latitude points. Returns
// a LineString sampled at `n` points so the air-corridor arc curves naturally
// over a Mercator basemap. For TRUCK we sample fewer points to keep the line
// nearly straight (still traces along major roads visually because the
// underlying tile carries them).
function greatCircleLine(
  start: [number, number],
  end: [number, number],
  n: number
): GeoJSON.LineString {
  const coordinates: [number, number][] = []
  const lon1 = (start[0] * Math.PI) / 180
  const lat1 = (start[1] * Math.PI) / 180
  const lon2 = (end[0] * Math.PI) / 180
  const lat2 = (end[1] * Math.PI) / 180

  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((lat2 - lat1) / 2) ** 2 +
          Math.cos(lat1) *
            Math.cos(lat2) *
            Math.sin((lon2 - lon1) / 2) ** 2
      )
    )

  for (let i = 0; i <= n; i++) {
    const f = i / n
    const A = Math.sin((1 - f) * d) / Math.sin(d || 1e-9)
    const B = Math.sin(f * d) / Math.sin(d || 1e-9)
    const x =
      A * Math.cos(lat1) * Math.cos(lon1) +
      B * Math.cos(lat2) * Math.cos(lon2)
    const y =
      A * Math.cos(lat1) * Math.sin(lon1) +
      B * Math.cos(lat2) * Math.sin(lon2)
    const z = A * Math.sin(lat1) + B * Math.sin(lat2)
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y))
    const lon = Math.atan2(y, x)
    coordinates.push([(lon * 180) / Math.PI, (lat * 180) / Math.PI])
  }

  return { type: "LineString", coordinates }
}

"use client"

import * as React from "react"
import Map, {
  type MapRef,
  type ViewStateChangeEvent,
  AttributionControl,
  NavigationControl,
} from "react-map-gl/maplibre"
import "maplibre-gl/dist/maplibre-gl.css"

import { cn } from "@workspace/ui/lib/utils"
import {
  VIOLET_GRID_MAP_STYLE,
  INDIA_BBOX,
} from "./map-style"

interface MapLibreMapProps {
  /** Children render as overlays / sources via react-map-gl. */
  children?: React.ReactNode
  /**
   * Initial view state. Pass `{ longitude, latitude, zoom }` for a fixed
   * position, or `{ bounds, fitBoundsOptions }` for auto-fit. Defaults to
   * fitting all of India with padding.
   */
  initialViewState?: {
    longitude?: number
    latitude?: number
    zoom?: number
    bounds?: [[number, number], [number, number]]
    fitBoundsOptions?: { padding?: number | { top: number; bottom: number; left: number; right: number } }
  }
  /** Lock the map to India bounds (default true). */
  lockToIndia?: boolean
  /** Show the built-in attribution control (always required by OSM ToS). */
  showAttribution?: boolean
  /** Show the navigation (zoom) control. */
  showNavigation?: boolean
  /** Reduce-motion respect. When true, animations are disabled. */
  reduceMotion?: boolean
  className?: string
  onMove?: (e: ViewStateChangeEvent) => void
  ariaLabel?: string
}

/**
 * MapLibre wrapper preconfigured for the Violet Grid design system.
 *
 * Decision 1 (OPEN-QUESTIONS-DECISIONS-2026-04-30.md): we ship MapLibre +
 * OpenFreeMap as the default basemap. Swapping providers later is a one-line
 * change in `map-style.ts`.
 */
export const MapLibreMap = React.forwardRef<MapRef, MapLibreMapProps>(
  function MapLibreMap(
    {
      children,
      initialViewState,
      lockToIndia = true,
      showAttribution = true,
      showNavigation = false,
      reduceMotion = false,
      className,
      onMove,
      ariaLabel = "Logistics network map",
    },
    ref
  ) {
    return (
      <div
        data-slot="maplibre-map"
        role="region"
        aria-label={ariaLabel}
        className={cn(
          "relative aspect-[16/10] w-full overflow-hidden border border-border bg-card",
          className
        )}
      >
        <Map
          ref={ref}
          mapStyle={VIOLET_GRID_MAP_STYLE}
          initialViewState={
            initialViewState ?? {
              bounds: [
                [INDIA_BBOX[0] - 1, INDIA_BBOX[1] - 1],
                [INDIA_BBOX[2] + 1, INDIA_BBOX[3] + 1],
              ],
              fitBoundsOptions: { padding: 32 },
            }
          }
          maxBounds={
            lockToIndia
              ? [
                  [INDIA_BBOX[0] - 5, INDIA_BBOX[1] - 5],
                  [INDIA_BBOX[2] + 5, INDIA_BBOX[3] + 5],
                ]
              : undefined
          }
          attributionControl={false}
          dragRotate={false}
          touchZoomRotate={false}
          fadeDuration={reduceMotion ? 0 : 200}
          onMove={onMove}
          // Tile prefetching keeps the user's pan feel snappy without
          // blowing up the connection — defaults are reasonable.
          mapLib={undefined}
        >
          {showAttribution && (
            <AttributionControl
              position="bottom-right"
              compact
              customAttribution="© OpenFreeMap · OSM"
            />
          )}
          {showNavigation && (
            <NavigationControl position="top-right" showCompass={false} />
          )}
          {children}
        </Map>
      </div>
    )
  }
)

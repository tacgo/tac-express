// Violet Grid basemap style for MapLibre GL JS.
//
// Built around OpenFreeMap's vector tiles (https://openfreemap.org/) — no API
// key, no quota, OSM-derived. The style is intentionally subtractive: minimal
// labels, dark purple-tinted background, only enough hierarchy to keep route arcs legible.
//
// Implementation notes
//  • Country/state borders are kept faint so the violet route arcs read as the
//    primary visual signal.
//  • Water bodies and built-up areas use slightly differing purple-tinted neutral
//    lightness values to give a sense of depth without painterly textures.
//  • All colors are static hex (MapLibre's style spec doesn't accept CSS
//    custom properties). They are tuned to match the Violet Grid dark palette
//    in `globals.css`. Update both files if the brand shifts.

import type { StyleSpecification } from "maplibre-gl"

const TILE_SOURCE_URL = "https://tiles.openfreemap.org/planet"

export const INDIA_BBOX: [number, number, number, number] = [
  68.1, 6.5, 97.4, 35.7,
]

export const INDIA_CENTER: [number, number] = [80.95, 22.97]

/**
 * Violet Grid map style. Pass directly to `<Map>` as `mapStyle`.
 * Layers are intentionally minimal — every additional layer pays in tile
 * decode time and keeps the eye away from the route arcs we draw on top.
 */
export const VIOLET_GRID_MAP_STYLE: StyleSpecification = {
  version: 8,
  name: "TAC Express · Violet Grid",
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  sources: {
    openfreemap: {
      type: "vector",
      url: TILE_SOURCE_URL,
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#252830" },
    },
    {
      id: "water",
      type: "fill",
      source: "openfreemap",
      "source-layer": "water",
      paint: { "fill-color": "#1b1d24", "fill-opacity": 0.95 },
    },
    {
      id: "landcover",
      type: "fill",
      source: "openfreemap",
      "source-layer": "landcover",
      paint: { "fill-color": "#1f2229", "fill-opacity": 0.6 },
    },
    {
      id: "country-border",
      type: "line",
      source: "openfreemap",
      "source-layer": "boundary",
      filter: ["all", ["==", ["get", "admin_level"], 2]],
      paint: {
        "line-color": "#3c4050",
        "line-width": 1.2,
        "line-opacity": 0.8,
      },
    },
    {
      id: "state-border",
      type: "line",
      source: "openfreemap",
      "source-layer": "boundary",
      filter: ["all", ["==", ["get", "admin_level"], 4]],
      paint: {
        "line-color": "#2a2e3a",
        "line-width": 0.6,
        "line-opacity": 0.7,
        "line-dasharray": [3, 2],
      },
    },
    {
      id: "highway",
      type: "line",
      source: "openfreemap",
      "source-layer": "transportation",
      filter: ["all", ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary"]]]],
      paint: {
        "line-color": "#2d3040",
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          5,
          0.4,
          12,
          1.4,
        ],
        "line-opacity": 0.5,
      },
    },
    {
      id: "place-country",
      type: "symbol",
      source: "openfreemap",
      "source-layer": "place",
      filter: ["==", ["get", "class"], "country"],
      layout: {
        "text-field": ["get", "name:en"],
        "text-font": ["Noto Sans Regular"],
        "text-size": 11,
        "text-letter-spacing": 0.18,
        "text-transform": "uppercase",
      },
      paint: {
        "text-color": "#606478",
        "text-halo-color": "#252830",
        "text-halo-width": 1.2,
      },
    },
    {
      id: "place-state",
      type: "symbol",
      source: "openfreemap",
      "source-layer": "place",
      filter: ["==", ["get", "class"], "state"],
      minzoom: 4,
      layout: {
        "text-field": ["get", "name:en"],
        "text-font": ["Noto Sans Regular"],
        "text-size": 9,
        "text-letter-spacing": 0.15,
        "text-transform": "uppercase",
      },
      paint: {
        "text-color": "#40445a",
        "text-halo-color": "#252830",
        "text-halo-width": 1,
      },
    },
  ],
}

export { TILE_SOURCE_URL }

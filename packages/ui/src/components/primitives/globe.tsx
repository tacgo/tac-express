"use client"

/* eslint-disable react/no-unknown-property -- react-three-fiber maps Three.js
   props (object, intensity, position, …) onto JSX; they are valid r3f props,
   not DOM attributes, so react/no-unknown-property is a false positive here. */

import * as React from "react"
import * as THREE from "three"
import ThreeGlobe from "three-globe"
import { Canvas, useThree } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { feature } from "topojson-client"
import type { Topology, GeometryCollection } from "topojson-specification"
// world-atlas ships no TS declarations — cast via unknown
import _topoRaw from "world-atlas/countries-110m.json"

const _topo = _topoRaw as unknown as Topology<{
  countries: GeometryCollection
  land: GeometryCollection
}>
const _countriesAll = feature(_topo, _topo.objects.countries)

// H3's polygonToCells (used by three-globe hex polygons) fails on:
//   1. Polar extremes — Antarctica has coordinates beyond ±85° lat
//   2. Anti-meridian crossing — Russia/Alaska rings jump >170° in longitude
// Filter these out before handing the dataset to three-globe.
function isH3Compatible(f: (typeof _countriesAll.features)[0]): boolean {
  const g = f.geometry
  if (!g || (g.type !== "Polygon" && g.type !== "MultiPolygon")) return false

  const polygons: number[][][][] =
    g.type === "MultiPolygon"
      ? (g.coordinates as number[][][][])
      : [(g.coordinates as number[][][])]

  for (const poly of polygons) {
    for (const ring of poly) {
      for (let i = 1; i < ring.length; i++) {
        const [lng, lat] = ring[i] as [number, number]
        const [prevLng] = ring[i - 1] as [number, number]
        if (Math.abs(lat) > 85) return false          // polar extreme (Antarctica)
        if (Math.abs(lng - prevLng) > 170) return false // anti-meridian crossing
      }
    }
  }
  return true
}

const countriesGeo = {
  ..._countriesAll,
  features: _countriesAll.features.filter(isH3Compatible),
}

// ── Public types ─────────────────────────────────────────────────────────────

export interface GlobeConfig {
  pointSize?: number
  globeColor?: string
  showAtmosphere?: boolean
  atmosphereColor?: string
  atmosphereAltitude?: number
  emissive?: string
  emissiveIntensity?: number
  shininess?: number
  polygonColor?: string
  ambientLight?: string
  directionalLeftLight?: string
  directionalTopLight?: string
  pointLight?: string
  arcTime?: number
  arcLength?: number
  rings?: number
  maxRings?: number
  initialPosition?: { lat: number; lng: number }
  autoRotate?: boolean
  autoRotateSpeed?: number
}

export interface Position {
  order: number
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  arcAlt: number
  color: string
}

interface WorldProps {
  globeConfig: GlobeConfig
  data: Position[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return m
    ? { r: parseInt(m[1]!, 16), g: parseInt(m[2]!, 16), b: parseInt(m[3]!, 16) }
    : null
}

export function genRandomNumbers(min: number, max: number, count: number): number[] {
  const arr: number[] = []
  while (arr.length < count) {
    const r = Math.floor(Math.random() * (max - min + 1)) + min
    if (!arr.includes(r)) arr.push(r)
  }
  return arr
}

// ── Globe mesh (runs inside Canvas) ─────────────────────────────────────────

function Globe({ globeConfig, data }: WorldProps) {
  const globeInstance = React.useMemo(
    () => new ThreeGlobe({ waitForGlobeReady: true, animateIn: true }),
    []
  )

  // --- Material ---
  React.useEffect(() => {
    const mat = globeInstance.globeMaterial() as THREE.MeshPhongMaterial
    mat.color = new THREE.Color(globeConfig.globeColor ?? "#1d072e")
    mat.emissive = new THREE.Color(globeConfig.emissive ?? "#000000")
    mat.emissiveIntensity = globeConfig.emissiveIntensity ?? 0.1
    mat.shininess = globeConfig.shininess ?? 0.9
  }, [globeInstance, globeConfig])

  // --- Country hex polygons ---
  React.useEffect(() => {
    globeInstance
      .hexPolygonsData(countriesGeo.features)
      .hexPolygonResolution(3)
      .hexPolygonMargin(0.7)
      .showAtmosphere(globeConfig.showAtmosphere ?? true)
      .atmosphereColor(globeConfig.atmosphereColor ?? "#ffffff")
      .atmosphereAltitude(globeConfig.atmosphereAltitude ?? 0.1)
      .hexPolygonColor(() => globeConfig.polygonColor ?? "rgba(255,255,255,0.7)")
  }, [globeInstance, globeConfig])

  // --- Arcs & rings ---
  React.useEffect(() => {
    const arcLength = globeConfig.arcLength ?? 0.9
    const arcTime = globeConfig.arcTime ?? 1000
    const rings = globeConfig.rings ?? 1

    globeInstance
      .arcsData(data)
      .arcStartLat((d: object) => (d as Position).startLat)
      .arcStartLng((d: object) => (d as Position).startLng)
      .arcEndLat((d: object) => (d as Position).endLat)
      .arcEndLng((d: object) => (d as Position).endLng)
      .arcColor((d: object) => (d as Position).color)
      .arcAltitude((d: object) => (d as Position).arcAlt)
      .arcStroke(() => genRandomNumbers(28, 38, 1)[0]! / 100)
      .arcDashLength(arcLength)
      .arcDashGap(4)
      .arcDashAnimateTime(() => genRandomNumbers(800, arcTime, 1)[0]!)

    const ringPoints = data.flatMap((p) => [
      { lat: p.startLat, lng: p.startLng },
      { lat: p.endLat, lng: p.endLng },
    ])

    globeInstance
      .ringsData(ringPoints)
      .ringColor((_d: object) => (t: number) => `rgba(124,58,237,${1 - t})`)
      .ringMaxRadius(globeConfig.maxRings ?? 3)
      .ringPropagationSpeed(rings * 2)
      .ringRepeatPeriod((arcTime * arcLength) / rings)
  }, [globeInstance, data, globeConfig])

  return <primitive object={globeInstance} />
}

// ── Renderer config (runs inside Canvas) ────────────────────────────────────

function RendererConfig() {
  const { gl, size } = useThree()
  React.useEffect(() => {
    gl.setPixelRatio(window.devicePixelRatio)
    gl.setSize(size.width, size.height)
    gl.setClearColor(0x000000, 0)
  }, [gl, size])
  return null
}

// ── Public: World Canvas wrapper ─────────────────────────────────────────────

export function World({ globeConfig, data }: WorldProps) {
  const cfg = globeConfig

  // Camera positioned at radius 300 from globe centre (three-globe default radius = 100)
  const cameraZ = 300
  const initPos = cfg.initialPosition ?? { lat: 20, lng: 78 }
  const phi = ((90 - initPos.lat) * Math.PI) / 180
  const theta = ((180 + initPos.lng) * Math.PI) / 180
  const camX = -cameraZ * Math.sin(phi) * Math.cos(theta)
  const camY = cameraZ * Math.cos(phi)
  const camZ = cameraZ * Math.sin(phi) * Math.sin(theta)

  return (
    <Canvas
      camera={{
        fov: 50,
        near: 180,
        far: 1800,
        position: [camX, camY, camZ],
      }}
    >
      <RendererConfig />
      <ambientLight color={cfg.ambientLight ?? "#ffffff"} intensity={0.6} />
      <directionalLight
        color={cfg.directionalLeftLight ?? "#ffffff"}
        intensity={4}
        position={[-400, 100, 400]}
      />
      <directionalLight
        color={cfg.directionalTopLight ?? "#ffffff"}
        intensity={1}
        position={[-200, 500, 200]}
      />
      <pointLight
        color={cfg.pointLight ?? "#ffffff"}
        intensity={0.8}
        position={[-200, 500, 200]}
      />
      <Globe globeConfig={cfg} data={data} />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate={cfg.autoRotate ?? true}
        autoRotateSpeed={cfg.autoRotateSpeed ?? 1}
        minPolarAngle={Math.PI / 3.5}
        maxPolarAngle={Math.PI - Math.PI / 3}
      />
    </Canvas>
  )
}

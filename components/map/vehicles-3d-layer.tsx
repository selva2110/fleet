'use client'

import { useEffect, useRef } from 'react'
import { useMap } from 'react-map-gl/mapbox'
import mapboxgl from 'mapbox-gl'
import * as THREE from 'three'
import { Vehicle3D } from '@/lib/vehicles/types';

const LAYER_ID = 'vehicles-3d'

export function Vehicles3DLayer({ vehicles }: { vehicles: Vehicle3D[] }) {
  const mapCollection = useMap()
  const mapRef = mapCollection.current
  const dataRef = useRef<Vehicle3D[]>(vehicles)
  dataRef.current = vehicles

  useEffect(() => {
    const map = mapRef?.getMap?.()
    if (!map) return
    const mbMap = map

    let renderer: THREE.WebGLRenderer | null = null
    let scene: THREE.Scene | null = null
    let camera: THREE.Camera | null = null
    let paintMaterials: THREE.MeshStandardMaterial[] = []
    let glowMaterial: THREE.MeshStandardMaterial | null = null

    const customLayer: mapboxgl.CustomLayerInterface = {
      id: LAYER_ID,
      type: 'custom',
      renderingMode: '3d',
      onAdd(_map, gl) {
        camera = new THREE.Camera()
        scene = new THREE.Scene()

        const ambient = new THREE.AmbientLight(0xffffff, 1.1)
        scene.add(ambient)
        const key = new THREE.DirectionalLight(0xffffff, 1.4)
        key.position.set(0.5, -1, 1)
        scene.add(key)
        const fill = new THREE.DirectionalLight(0xffffff, 0.6)
        fill.position.set(-0.6, 0.4, 0.8)
        scene.add(fill)

        const { car, bodyMaterials, glow } = buildCar()
        paintMaterials = bodyMaterials
        glowMaterial = glow
        scene.add(car)

        renderer = new THREE.WebGLRenderer({
          canvas: map.getCanvas(),
          context: gl,
          antialias: true,
        })
        renderer.autoClear = false
      },
      render(_gl, matrix) {
        if (!renderer || !scene || !camera) return
        const cars = dataRef.current
        if (cars.length === 0) return

        // `matrix` maps mercator world coordinates to clip space. Compose a
        // per-vehicle model matrix and premultiply so one shared model renders
        // at every vehicle location this frame.
        const base = new THREE.Matrix4().fromArray(matrix as unknown as number[])

        for (const v of cars) {
          const merc = mapboxgl.MercatorCoordinate.fromLngLat([v.lng, v.lat], 0)
          const s = merc.meterInMercatorCoordinateUnits()
          const model = new THREE.Matrix4()
            .makeTranslation(merc.x, merc.y, merc.z)
            .multiply(new THREE.Matrix4().makeScale(s, -s, s))
            // Bearing: 0deg = north (+y). Negate so clockwise headings turn the
            // model clockwise under the mirrored (‑y) mercator scale.
            .multiply(new THREE.Matrix4().makeRotationZ(-(v.heading * Math.PI) / 180))

          camera.projectionMatrix = base.clone().multiply(model)

          const paint = v.highlighted ? '#2563eb' : v.color
          for (const mat of paintMaterials) mat.color.set(paint)
          if (glowMaterial) {
            glowMaterial.emissive.set(v.highlighted ? '#1d4ed8' : v.color)
            glowMaterial.emissiveIntensity = v.highlighted ? 0.9 : 0.35
          }

          renderer.resetState()
          renderer.render(scene, camera)
        }

        map.triggerRepaint()
      },
      onRemove() {
        renderer?.dispose()
        renderer = null
        scene = null
        camera = null
        paintMaterials = []
        glowMaterial = null
      },
    }

    function addLayer() {
      if (!mbMap.getLayer(LAYER_ID)) {
        mbMap.addLayer(customLayer)
      }
    }

    if (mbMap.isStyleLoaded()) {
      addLayer()
    } else {
      mbMap.once('style.load', addLayer)
    }

    return () => {
      mbMap.off?.("style.load", addLayer)
      try {
        if (!mbMap.isStyleLoaded()) {
          return
        }
        if (mbMap.getLayer(LAYER_ID)) {
          mbMap.removeLayer(LAYER_ID)
        }
      } catch (err) {
        console.warn("[vehicles-3d] cleanup skipped:", err)
      }
    }
      }, [mapRef])

  return null
}

/**
 * Assemble a recognizable car from three.js primitives, modeled in meters with
 * the vehicle lying flat in the mercator plane: +x = width, +y = forward
 * (north at heading 0), +z = up. Returns the group plus the materials whose
 * color is repainted per vehicle.
 */
function buildCar(): {
  car: THREE.Group
  bodyMaterials: THREE.MeshStandardMaterial[]
  glow: THREE.MeshStandardMaterial
} {
  const car = new THREE.Group()

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: '#2563eb',
    metalness: 0.5,
    roughness: 0.45,
  })
  const cabinMaterial = new THREE.MeshStandardMaterial({
    color: '#2563eb',
    metalness: 0.5,
    roughness: 0.45,
  })
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: '#0f172a',
    metalness: 0.2,
    roughness: 0.1,
    transparent: true,
    opacity: 0.85,
  })
  const wheelMaterial = new THREE.MeshStandardMaterial({
    color: '#111827',
    metalness: 0.3,
    roughness: 0.8,
  })
  const lightMaterial = new THREE.MeshStandardMaterial({
    color: '#fef3c7',
    emissive: '#f59e0b',
    emissiveIntensity: 0.6,
  })

  // Lower body — length 4.4m (y), width 2m (x), height 0.7m sitting above wheels.
  const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(2, 4.4, 0.8), bodyMaterial)
  lowerBody.position.set(0, 0, 0.75)
  car.add(lowerBody)

  // Rounded roof/cabin, shorter and set back slightly.
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.2, 0.7), cabinMaterial)
  cabin.position.set(0, -0.1, 1.45)
  car.add(cabin)

  // Windshield + rear glass wrap.
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.72, 2.24, 0.5), glassMaterial)
  glass.position.set(0, -0.1, 1.5)
  car.add(glass)

  // Headlights (front = +y).
  for (const x of [-0.7, 0.7]) {
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.25), lightMaterial)
    light.position.set(x, 2.2, 0.85)
    car.add(light)
  }

  // Wheels — cylinders lying along the x (width) axis.
  const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.35, 20)
  wheelGeo.rotateZ(Math.PI / 2)
  const wheelPositions: [number, number][] = [
    [-1, 1.4],
    [1, 1.4],
    [-1, -1.4],
    [1, -1.4],
  ]
  for (const [x, y] of wheelPositions) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMaterial)
    wheel.position.set(x, y, 0.5)
    car.add(wheel)
  }

  return { car, bodyMaterials: [bodyMaterial, cabinMaterial], glow: lightMaterial }
}

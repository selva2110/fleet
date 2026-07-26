'use client'

import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import {
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
  RoundedBox,
} from '@react-three/drei'
import * as THREE from 'three'
import type { VehicleType } from '@/lib/types'

type Shape = 'sedan' | 'suv' | 'van' | 'bus'

interface VehicleSpec {
  shape: Shape
  length: number
  width: number
  bodyHeight: number
  cabinHeight: number
  cabinRatio: number // fraction of length taken by greenhouse
  cabinShift: number // x offset of cabin (positive = forward)
  color: string
  accent?: string
  axles: number
  wheelRadius: number
  lightBar?: boolean
  cross?: boolean
  ramp?: boolean
}

const SPECS: Record<VehicleType, VehicleSpec> = {
  Sedan: {
    shape: 'sedan',
    length: 4.2,
    width: 1.8,
    bodyHeight: 0.62,
    cabinHeight: 0.62,
    cabinRatio: 0.5,
    cabinShift: -0.15,
    color: '#e9edf2',
    axles: 2,
    wheelRadius: 0.36,
  },
  SUV: {
    shape: 'suv',
    length: 4.5,
    width: 1.95,
    bodyHeight: 0.8,
    cabinHeight: 0.78,
    cabinRatio: 0.62,
    cabinShift: -0.1,
    color: '#c6ccd4',
    axles: 2,
    wheelRadius: 0.42,
  },
  Van: {
    shape: 'van',
    length: 4.9,
    width: 2,
    bodyHeight: 1.0,
    cabinHeight: 0.95,
    cabinRatio: 0.72,
    cabinShift: -0.35,
    color: '#eef1f5',
    axles: 2,
    wheelRadius: 0.42,
  },
  'Wheelchair Accessible Van': {
    shape: 'van',
    length: 5.0,
    width: 2.05,
    bodyHeight: 1.05,
    cabinHeight: 1.0,
    cabinRatio: 0.72,
    cabinShift: -0.35,
    color: '#eef2f7',
    accent: '#2563eb',
    axles: 2,
    wheelRadius: 0.42,
    ramp: true,
  },
  'Medical Transport Vehicle': {
    shape: 'van',
    length: 5.2,
    width: 2.05,
    bodyHeight: 1.15,
    cabinHeight: 1.02,
    cabinRatio: 0.66,
    cabinShift: -0.45,
    color: '#f4f6f9',
    accent: '#dc2626',
    axles: 2,
    wheelRadius: 0.44,
    cross: true,
  },
  'Mini Bus': {
    shape: 'bus',
    length: 6.0,
    width: 2.1,
    bodyHeight: 1.35,
    cabinHeight: 0.9,
    cabinRatio: 0.82,
    cabinShift: -0.2,
    color: '#eef2f7',
    accent: '#1d4ed8',
    axles: 2,
    wheelRadius: 0.46,
  },
  'Shuttle Bus': {
    shape: 'bus',
    length: 7.4,
    width: 2.2,
    bodyHeight: 1.6,
    cabinHeight: 1.0,
    cabinRatio: 0.88,
    cabinShift: -0.15,
    color: '#f0f3f7',
    accent: '#0ea5e9',
    axles: 3,
    wheelRadius: 0.5,
  },
  Ambulance: {
    shape: 'van',
    length: 5.4,
    width: 2.1,
    bodyHeight: 1.3,
    cabinHeight: 1.0,
    cabinRatio: 0.62,
    cabinShift: -0.5,
    color: '#f5f7fa',
    accent: '#dc2626',
    axles: 2,
    wheelRadius: 0.46,
    lightBar: true,
    cross: true,
  },
}

function Wheel({ x, z, r, width }: { x: number; z: number; r: number; width: number }) {
  return (
    <group position={[x, r, z]} rotation={[Math.PI / 2, 0, 0]}>
      {/* tire */}
      <mesh castShadow>
        <cylinderGeometry args={[r, r, width, 32]} />
        <meshStandardMaterial color="#1b1d22" roughness={0.75} metalness={0.1} />
      </mesh>
      {/* rim */}
      <mesh position={[0, width * 0.5 + 0.001, 0]}>
        <cylinderGeometry args={[r * 0.58, r * 0.58, 0.02, 24]} />
        <meshStandardMaterial color="#c4c9d0" roughness={0.3} metalness={0.85} />
      </mesh>
    </group>
  )
}

function VehicleModel({ type }: { type: VehicleType }) {
  const spec = SPECS[type]
  const {
    length,
    width,
    bodyHeight,
    cabinHeight,
    cabinRatio,
    cabinShift,
    color,
    accent,
    axles,
    wheelRadius,
    lightBar,
    cross,
    ramp,
  } = spec

  const clearance = wheelRadius * 0.55
  const bodyY = clearance + bodyHeight / 2
  const cabinLen = length * cabinRatio
  const cabinY = clearance + bodyHeight + cabinHeight / 2
  const glassInset = 0.06

  const wheelPositions = useMemo(() => {
    const wt = width * 0.5 - 0.05
    if (axles === 3) {
      return [
        { x: length * 0.34, z: wt },
        { x: length * 0.34, z: -wt },
        { x: -length * 0.24, z: wt },
        { x: -length * 0.24, z: -wt },
        { x: -length * 0.4, z: wt },
        { x: -length * 0.4, z: -wt },
      ]
    }
    return [
      { x: length * 0.32, z: wt },
      { x: length * 0.32, z: -wt },
      { x: -length * 0.32, z: wt },
      { x: -length * 0.32, z: -wt },
    ]
  }, [axles, length, width])

  const bodyMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.28,
        metalness: 0.55,
        clearcoat: 1,
        clearcoatRoughness: 0.15,
      }),
    [color],
  )

  return (
    <group position={[0, 0, 0]}>
      {/* Lower body */}
      <RoundedBox
        args={[length, bodyHeight, width]}
        radius={Math.min(0.22, bodyHeight / 2 - 0.01)}
        smoothness={5}
        position={[0, bodyY, 0]}
        castShadow
        receiveShadow
      >
        <primitive object={bodyMat} attach="material" />
      </RoundedBox>

      {/* Greenhouse / cabin */}
      <RoundedBox
        args={[cabinLen, cabinHeight, width * 0.94]}
        radius={0.14}
        smoothness={5}
        position={[cabinShift, cabinY, 0]}
        castShadow
      >
        <primitive object={bodyMat} attach="material" />
      </RoundedBox>

      {/* Wraparound glass band */}
      <RoundedBox
        args={[cabinLen - glassInset * 2, cabinHeight * 0.5, width * 0.98]}
        radius={0.08}
        smoothness={4}
        position={[cabinShift, cabinY + cabinHeight * 0.08, 0]}
      >
        <meshPhysicalMaterial
          color="#141922"
          roughness={0.08}
          metalness={0.2}
          transmission={0.15}
          clearcoat={1}
        />
      </RoundedBox>

      {/* Accent stripe along lower body sides */}
      {accent ? (
        <>
          <mesh position={[cabinShift, bodyY, width / 2 + 0.001]}>
            <boxGeometry args={[length * 0.86, bodyHeight * 0.16, 0.02]} />
            <meshStandardMaterial color={accent} roughness={0.4} metalness={0.3} />
          </mesh>
          <mesh position={[cabinShift, bodyY, -width / 2 - 0.001]}>
            <boxGeometry args={[length * 0.86, bodyHeight * 0.16, 0.02]} />
            <meshStandardMaterial color={accent} roughness={0.4} metalness={0.3} />
          </mesh>
        </>
      ) : null}

      {/* Medical cross on both sides */}
      {cross ? (
        <>
          {[width / 2 + 0.015, -width / 2 - 0.015].map((z, i) => (
            <group key={i} position={[cabinShift + length * 0.05, bodyY + bodyHeight * 0.12, z]}>
              <mesh>
                <boxGeometry args={[0.34, 0.11, 0.01]} />
                <meshStandardMaterial color="#dc2626" />
              </mesh>
              <mesh>
                <boxGeometry args={[0.11, 0.34, 0.01]} />
                <meshStandardMaterial color="#dc2626" />
              </mesh>
            </group>
          ))}
        </>
      ) : null}

      {/* Emergency light bar */}
      {lightBar ? (
        <group position={[cabinShift + cabinLen * 0.2, cabinY + cabinHeight / 2 + 0.06, 0]}>
          <mesh position={[0, 0, width * 0.18]}>
            <boxGeometry args={[0.5, 0.12, 0.28]} />
            <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.6} />
          </mesh>
          <mesh position={[0, 0, -width * 0.18]}>
            <boxGeometry args={[0.5, 0.12, 0.28]} />
            <meshStandardMaterial color="#2563eb" emissive="#2563eb" emissiveIntensity={0.6} />
          </mesh>
        </group>
      ) : null}

      {/* Rear wheelchair ramp */}
      {ramp ? (
        <mesh
          position={[-length / 2 - 0.28, clearance * 0.5, 0]}
          rotation={[0, 0, -0.32]}
          castShadow
        >
          <boxGeometry args={[1.0, 0.05, width * 0.7]} />
          <meshStandardMaterial color="#3b4250" roughness={0.6} metalness={0.4} />
        </mesh>
      ) : null}

      {/* Headlights */}
      {[width * 0.32, -width * 0.32].map((z, i) => (
        <mesh key={i} position={[length / 2 - 0.02, bodyY + 0.05, z]}>
          <boxGeometry args={[0.04, 0.14, 0.24]} />
          <meshStandardMaterial color="#f8fafc" emissive="#e2e8f0" emissiveIntensity={0.4} />
        </mesh>
      ))}

      {/* Wheels */}
      {wheelPositions.map((p, i) => (
        <Wheel key={i} x={p.x} z={p.z} r={wheelRadius} width={0.28} />
      ))}
    </group>
  )
}

function Turntable({ type }: { type: VehicleType }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.35
  })
  return (
    <group ref={ref}>
      <VehicleModel type={type} />
    </group>
  )
}

export default function Vehicle3D({ type }: { type: VehicleType }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [7, 3.5, 8], fov: 38 }}
      gl={{ alpha: true, antialias: true }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[6, 9, 5]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-6, 5, -4]} intensity={0.6} />
      <Turntable type={type} />
      <ContactShadows
        position={[0, 0, 0]}
        opacity={0.45}
        scale={16}
        blur={2.4}
        far={6}
        resolution={512}
      />
      {/* Self-contained studio environment (no external HDR fetch) */}
      <Environment resolution={256}>
        <Lightformer intensity={2.2} position={[0, 5, 2]} scale={[10, 5, 1]} />
        <Lightformer intensity={1} position={[-5, 2, -2]} scale={[5, 5, 1]} color="#b9ccff" />
        <Lightformer intensity={1.4} position={[5, 3, 2]} scale={[5, 5, 1]} />
        <Lightformer intensity={0.8} position={[0, 2, -6]} scale={[10, 5, 1]} color="#dfe7f5" />
      </Environment>
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2.05}
        autoRotate={false}
      />
    </Canvas>
  )
}

import type { VehicleType } from './types'

// Rendered 3D-style reference image + short description for every vehicle type.
// Files live in /public/vehicles and are generated as product-style renders so
// operators can instantly recognise what each vehicle class looks like.
export const vehicleTypeImages: Record<VehicleType, string> = {
  Sedan: '/vehicles/sedan.png',
  SUV: '/vehicles/suv.png',
  Van: '/vehicles/van.png',
  'Wheelchair Accessible Van': '/vehicles/wheelchair-van.png',
  'Medical Transport Vehicle': '/vehicles/medical-transport.png',
  'Mini Bus': '/vehicles/mini-bus.png',
  'Shuttle Bus': '/vehicles/shuttle-bus.png',
  Ambulance: '/vehicles/ambulance.png',
}

export const vehicleTypeDescriptions: Record<VehicleType, string> = {
  Sedan: 'Compact car for 1–3 ambulatory riders. Fast and fuel-efficient for short routes.',
  SUV: 'Higher clearance and seating for small groups or riders needing extra legroom.',
  Van: 'Standard passenger van seating up to 8 ambulatory participants.',
  'Wheelchair Accessible Van': 'Side or rear ramp/lift with securement points for wheelchair riders.',
  'Medical Transport Vehicle': 'Non-emergency medical transport with oxygen and clinical support.',
  'Mini Bus': 'Mid-size bus for larger groups heading to the same center.',
  'Shuttle Bus': 'High-capacity shuttle for community programs and large events.',
  Ambulance: 'Emergency-capable transport for stretcher and critical-priority riders.',
}

export function vehicleImage(type: VehicleType, override?: string | null): string {
  return override && override.trim() ? override : vehicleTypeImages[type]
}

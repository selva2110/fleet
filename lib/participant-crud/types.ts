// Isolated Participant CRUD domain. This model is the source of truth for the
// rich participant profile described in the CareVoy brief. It is intentionally
// independent from the legacy `lib/participant` model (used by events/trips) so
// the two can evolve separately until a real API replaces this mock service.

export type ParticipantStatus = "ACTIVE" | "INACTIVE";
export type Gender = "MALE" | "FEMALE" | "OTHER" | "UNKNOWN" | "";

export interface AddressBlock {
  streetName: string;
  city: string;
  state: string;
  zip: string;
}

export interface CareCircleMember {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  relationship: string;
  email: string;
  countryCode: string;
  phone: string;
}

/** Structured view of one emergency contact (maps to/from the flat fields). */
export interface EmergencyContact {
  firstName: string;
  middleName: string;
  lastName: string;
  relationship: string;
  email: string;
  countryCode: string;
  phone: string;
  homeCountryCode: string;
  homePhone: string;
  workCountryCode: string;
  workPhone: string;
  hcaType: string;
  instructions: string;
}

export interface Participant {
  id: string;

  // Personal
  firstName: string;
  middleName: string;
  lastName: string;
  preferredName: string;
  gender: Gender;
  dob: string;
  profilePic: string;

  // Contact
  email: string;
  countryCode: string;
  phoneNumber: string;
  homeCountryCode: string;
  homePhoneNumber: string;
  workCountryCode: string;
  workPhoneNumber: string;

  // Address
  country: string;
  state: string;
  city: string;
  zipCode: string;
  location: string;
  latitude: string;
  longitude: string;
  placeId: string;
  presentAddress: AddressBlock;
  permanentAddress: AddressBlock;

  // Organization
  organizationId: number | null;
  locationId: number[];
  agencyId: number | null;
  groupId: number | null;
  roleId: number | null;
  center: number[];

  // Services
  services: number[];

  // Care preferences
  residenceType: string;
  preferredCaregiverId: number[];
  notPreferredCaregiverId: number[];
  orientCaregiverId: number | null;
  primaryLanguage: string;
  secondaryLanguage: string;
  language: string;
  relationship: string;
  martialStatus: string;

  // Emergency contacts (flat, per the model spec)
  emergencyContact1FirstName: string;
  emergencyContact1MiddleName: string;
  emergencyContact1LastName: string;
  emergencyContact1Relationship: string;
  emergencyContact1Phone: string;
  emergencyContact1CountryCode: string;
  emergencyContact1HomeCountryCode: string;
  emergencyContact1HomePhone: string;
  emergencyContact1WorkCountryCode: string;
  emergencyContact1WorkPhone: string;
  emergencyContact1HcaType: string;
  emergencyContact1email: string;
  emergencyContact1Instructions: string;

  emergencyContact2FirstName: string;
  emergencyContact2MiddleName: string;
  emergencyContact2LastName: string;
  emergencyContact2Relationship: string;
  emergencyContact2Phone: string;
  emergencyContact2CountryCode: string;
  emergencyContact2HomeCountryCode: string;
  emergencyContact2HomePhone: string;
  emergencyContact2WorkCountryCode: string;
  emergencyContact2WorkPhone: string;
  emergencyContact2HcaType: string;
  emergencyContact2email: string;
  emergencyContact2Instructions: string;

  // Care circle
  careCircle: CareCircleMember[];

  // Additional
  mrnNumber: string;
  homeInstruction: string;
  notes: string;
  LockboxCode: boolean;
  highRisk: boolean;

  // Sensitive
  socialSecurity: string;
  password: string;

  // Profile / status
  status: ParticipantStatus;
  isFirstLogin: boolean;
  isProfileCompleted: boolean;
  isProfileVerified: boolean;
  enrollmentStatus: boolean;
  requiresPasswordReset: boolean;
  isLoggedIn: boolean;

  // Identity / linkage
  userId: number | null;
  sharedResidenceMrnId: number | null;

  createdAt: string;
}

/** Input shape for create/update — everything except server-owned fields. */
export type ParticipantInput = Omit<Participant, "id" | "createdAt">;

export interface LookupOption {
  id: number;
  name: string;
}

export interface ParticipantQuery {
  search?: string;
  status?: ParticipantStatus | "";
  gender?: Gender;
  enrollment?: "enrolled" | "not-enrolled" | "";
  profileCompleted?: "yes" | "no" | "";
  profileVerified?: "yes" | "no" | "";
  highRisk?: "yes" | "no" | "";
  residenceType?: string;
  primaryLanguage?: string;
  secondaryLanguage?: string;
  country?: string;
  state?: string;
  city?: string;
}

// -------------------------------------------------------------------------
// Emergency-contact flat <-> structured mapping helpers
// -------------------------------------------------------------------------

type EcPrefix = "emergencyContact1" | "emergencyContact2";

export function getEmergencyContact(
  p: ParticipantInput,
  index: 1 | 2,
): EmergencyContact {
  const k = (`emergencyContact${index}` as EcPrefix);
  return {
    firstName: p[`${k}FirstName`],
    middleName: p[`${k}MiddleName`],
    lastName: p[`${k}LastName`],
    relationship: p[`${k}Relationship`],
    email: p[`${k}email`],
    countryCode: p[`${k}CountryCode`],
    phone: p[`${k}Phone`],
    homeCountryCode: p[`${k}HomeCountryCode`],
    homePhone: p[`${k}HomePhone`],
    workCountryCode: p[`${k}WorkCountryCode`],
    workPhone: p[`${k}WorkPhone`],
    hcaType: p[`${k}HcaType`],
    instructions: p[`${k}Instructions`],
  };
}

export function applyEmergencyContact(
  p: ParticipantInput,
  index: 1 | 2,
  ec: EmergencyContact,
): ParticipantInput {
  const k = (`emergencyContact${index}` as EcPrefix);
  return {
    ...p,
    [`${k}FirstName`]: ec.firstName,
    [`${k}MiddleName`]: ec.middleName,
    [`${k}LastName`]: ec.lastName,
    [`${k}Relationship`]: ec.relationship,
    [`${k}email`]: ec.email,
    [`${k}CountryCode`]: ec.countryCode,
    [`${k}Phone`]: ec.phone,
    [`${k}HomeCountryCode`]: ec.homeCountryCode,
    [`${k}HomePhone`]: ec.homePhone,
    [`${k}WorkCountryCode`]: ec.workCountryCode,
    [`${k}WorkPhone`]: ec.workPhone,
    [`${k}HcaType`]: ec.hcaType,
    [`${k}Instructions`]: ec.instructions,
  };
}

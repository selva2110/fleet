import type { Gender, ParticipantInput, ParticipantStatus } from "./types";
import {
  CITIES,
  COUNTRIES,
  LANGUAGES,
  MARITAL_STATUSES,
  RELATIONSHIPS,
  RESIDENCE_TYPES,
  STATES,
} from "./mock-data";

// -------------------------------------------------------------------------
// Select option helpers
// -------------------------------------------------------------------------

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "", label: "Select gender" },
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
  { value: "UNKNOWN", label: "Prefer not to say" },
];

export const STATUS_OPTIONS: { value: ParticipantStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

export function toStringOptions(values: string[], placeholder?: string) {
  const base = values.map((v) => ({ value: v, label: v }));
  return placeholder ? [{ value: "", label: placeholder }, ...base] : base;
}

export const RESIDENCE_OPTIONS = toStringOptions(RESIDENCE_TYPES, "Select type");
export const LANGUAGE_OPTIONS = toStringOptions(LANGUAGES, "Select language");
export const RELATIONSHIP_OPTIONS = toStringOptions(RELATIONSHIPS, "Select");
export const MARITAL_OPTIONS = toStringOptions(MARITAL_STATUSES, "Select");
export const COUNTRY_OPTIONS = toStringOptions(COUNTRIES, "Select country");
export const STATE_OPTIONS = toStringOptions(STATES, "Select state");
export const CITY_OPTIONS = toStringOptions(CITIES, "Select city");

export const GENDER_LABEL: Record<string, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
  UNKNOWN: "Prefer not to say",
  "": "—",
};

// -------------------------------------------------------------------------
// Badge tones (token-based so they follow the app theme)
// -------------------------------------------------------------------------

export function statusTone(status: ParticipantStatus): string {
  return status === "ACTIVE"
    ? "bg-primary/10 text-primary"
    : "bg-muted text-muted-foreground";
}

export const RISK_TONE = "bg-destructive/10 text-destructive";
export const ENROLLED_TONE = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
export const NEUTRAL_TONE = "bg-muted text-muted-foreground";

// -------------------------------------------------------------------------
// Sort options for the list toolbar
// -------------------------------------------------------------------------

export const SORT_OPTIONS = [
  { key: "name", label: "Name" },
  { key: "mrn", label: "MRN" },
  { key: "enrollment", label: "Enrollment" },
  { key: "createdAt", label: "Date Added" },
];

// -------------------------------------------------------------------------
// Validation
// -------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ZIP_RE = /^\d{5}(-\d{4})?$/;
const PHONE_RE = /^[\d\s()+-]{7,20}$/;

export type ParticipantErrors = Partial<Record<string, string>>;

export function validateParticipant(p: ParticipantInput): ParticipantErrors {
  const errors: ParticipantErrors = {};

  if (!p.firstName.trim()) errors.firstName = "First name is required.";
  if (!p.lastName.trim()) errors.lastName = "Last name is required.";

  if (p.email.trim() && !EMAIL_RE.test(p.email.trim()))
    errors.email = "Enter a valid email address.";

  if (p.phoneNumber.trim() && !PHONE_RE.test(p.phoneNumber.trim()))
    errors.phoneNumber = "Enter a valid phone number.";

  if (p.zipCode.trim() && !ZIP_RE.test(p.zipCode.trim()))
    errors.zipCode = "Enter a valid ZIP (12345 or 12345-6789).";

  if (p.dob.trim()) {
    const d = new Date(p.dob);
    if (Number.isNaN(d.getTime())) {
      errors.dob = "Enter a valid date.";
    } else if (d.getTime() > Date.now()) {
      errors.dob = "Date of birth cannot be in the future.";
    }
  }

  return errors;
}

// -------------------------------------------------------------------------
// Empty draft factory (used by the Create form)
// -------------------------------------------------------------------------

export function emptyParticipant(): ParticipantInput {
  return {
    firstName: "",
    middleName: "",
    lastName: "",
    preferredName: "",
    gender: "",
    dob: "",
    profilePic: "",

    email: "",
    countryCode: "+1",
    phoneNumber: "",
    homeCountryCode: "",
    homePhoneNumber: "",
    workCountryCode: "",
    workPhoneNumber: "",

    country: "",
    state: "",
    city: "",
    zipCode: "",
    location: "",
    latitude: "",
    longitude: "",
    placeId: "",
    presentAddress: { streetName: "", city: "", state: "", zip: "" },
    permanentAddress: { streetName: "", city: "", state: "", zip: "" },

    organizationId: null,
    locationId: [],
    agencyId: null,
    groupId: null,
    roleId: null,
    center: [],

    services: [],

    residenceType: "",
    preferredCaregiverId: [],
    notPreferredCaregiverId: [],
    orientCaregiverId: null,
    primaryLanguage: "",
    secondaryLanguage: "",
    language: "",
    relationship: "",
    martialStatus: "",

    emergencyContact1FirstName: "",
    emergencyContact1MiddleName: "",
    emergencyContact1LastName: "",
    emergencyContact1Relationship: "",
    emergencyContact1Phone: "",
    emergencyContact1CountryCode: "+1",
    emergencyContact1HomeCountryCode: "",
    emergencyContact1HomePhone: "",
    emergencyContact1WorkCountryCode: "",
    emergencyContact1WorkPhone: "",
    emergencyContact1HcaType: "",
    emergencyContact1email: "",
    emergencyContact1Instructions: "",

    emergencyContact2FirstName: "",
    emergencyContact2MiddleName: "",
    emergencyContact2LastName: "",
    emergencyContact2Relationship: "",
    emergencyContact2Phone: "",
    emergencyContact2CountryCode: "+1",
    emergencyContact2HomeCountryCode: "",
    emergencyContact2HomePhone: "",
    emergencyContact2WorkCountryCode: "",
    emergencyContact2WorkPhone: "",
    emergencyContact2HcaType: "",
    emergencyContact2email: "",
    emergencyContact2Instructions: "",

    careCircle: [],

    mrnNumber: "",
    homeInstruction: "",
    notes: "",
    LockboxCode: false,
    highRisk: false,

    socialSecurity: "",
    password: "",

    status: "ACTIVE",
    isFirstLogin: true,
    isProfileCompleted: false,
    isProfileVerified: false,
    enrollmentStatus: false,
    requiresPasswordReset: false,
    isLoggedIn: false,

    userId: null,
    sharedResidenceMrnId: null,
  };
}

export function maskSSN(ssn: string): string {
  const digits = ssn.replace(/\D/g, "");
  if (!digits) return "—";
  const last4 = digits.slice(-4);
  return `•••-••-${last4}`;
}

export function fullName(p: {
  firstName: string;
  middleName?: string;
  lastName: string;
}): string {
  return [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ");
}

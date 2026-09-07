import type { LookupOption, Participant } from "./types";

// -------------------------------------------------------------------------
// Lookup tables (id -> display name). In production these come from the API;
// here they are the single source of truth for organization/service/etc IDs.
// -------------------------------------------------------------------------

export const ORGANIZATIONS: LookupOption[] = [
  { id: 1, name: "CareVoy Health Network" },
  { id: 2, name: "Gulf Coast Medical Group" },
  { id: 3, name: "Lone Star Community Care" },
];

export const LOCATIONS: LookupOption[] = [
  { id: 11, name: "Houston Central" },
  { id: 12, name: "Katy Branch" },
  { id: 13, name: "Sugar Land Clinic" },
  { id: 14, name: "The Woodlands" },
  { id: 15, name: "Pasadena Center" },
];

export const AGENCIES: LookupOption[] = [
  { id: 21, name: "Bluebonnet Home Care" },
  { id: 22, name: "Bayou City Assist" },
  { id: 23, name: "Sunrise Support Services" },
];

export const GROUPS: LookupOption[] = [
  { id: 31, name: "Medicaid Waiver" },
  { id: 32, name: "Managed Care" },
  { id: 33, name: "Private Pay" },
  { id: 34, name: "VA Benefits" },
];

export const ROLES: LookupOption[] = [
  { id: 41, name: "Participant" },
  { id: 42, name: "Member" },
  { id: 43, name: "Guardian-Managed" },
];

export const SERVICES: LookupOption[] = [
  { id: 1, name: "Transportation" },
  { id: 2, name: "Personal Care" },
  { id: 3, name: "Meal Assistance" },
  { id: 4, name: "Medication Assistance" },
  { id: 5, name: "Physical Therapy" },
  { id: 6, name: "Companionship" },
];

export const CAREGIVERS: LookupOption[] = [
  { id: 101, name: "Alicia Romero" },
  { id: 102, name: "Marcus Bell" },
  { id: 103, name: "Priya Nair" },
  { id: 104, name: "Devon Clarke" },
  { id: 105, name: "Hana Suzuki" },
  { id: 106, name: "Omar Haddad" },
];

// -------------------------------------------------------------------------
// Filter/select option lists
// -------------------------------------------------------------------------

export const RESIDENCE_TYPES = [
  "Private Home",
  "Assisted Living",
  "Group Home",
  "Skilled Nursing",
  "Apartment",
];

export const LANGUAGES = [
  "English",
  "Spanish",
  "Vietnamese",
  "Mandarin",
  "Arabic",
  "French",
  "Hindi",
];

export const RELATIONSHIPS = [
  "Self",
  "Spouse",
  "Son",
  "Daughter",
  "Parent",
  "Sibling",
  "Friend",
  "Guardian",
  "Caregiver",
];

export const MARITAL_STATUSES = [
  "Single",
  "Married",
  "Divorced",
  "Widowed",
  "Separated",
];

export const HCA_TYPES = ["Primary", "Secondary", "Backup", "Emergency Only"];

export const COUNTRIES = ["United States"];

export const STATES = ["Texas", "Louisiana", "Oklahoma", "New Mexico"];

export const CITIES = [
  "Houston",
  "Katy",
  "Sugar Land",
  "The Woodlands",
  "Pasadena",
  "Pearland",
  "Baytown",
];

export const COUNTRY_CODES = ["+1", "+52", "+44", "+91", "+63"];

// -------------------------------------------------------------------------
// Seeded participants
// -------------------------------------------------------------------------

const FIRST = [
  "Maria", "James", "Linda", "Robert", "Patricia", "Michael", "Barbara",
  "William", "Elizabeth", "David", "Jennifer", "Richard", "Susan", "Joseph",
  "Karen", "Thomas", "Nancy", "Carlos", "Aisha", "Wei", "Sofia", "Daniel",
  "Grace", "Hassan", "Elena", "Samuel", "Rosa", "Victor",
];
const LAST = [
  "Lopez", "Nguyen", "Johnson", "Smith", "Garcia", "Brown", "Davis",
  "Martinez", "Wilson", "Anderson", "Taylor", "Thomas", "Moore", "Jackson",
  "Lee", "Perez", "White", "Harris", "Khan", "Chen", "Rossi", "Clark",
  "Adams", "Ali", "Petrov", "Reed", "Diaz", "Hughes",
];
const MIDDLE = ["", "A.", "M.", "J.", "R.", "L.", "", "E.", "", "T."];

function pad(n: number, len = 4) {
  return String(n).padStart(len, "0");
}

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function makeParticipant(i: number): Participant {
  const firstName = pick(FIRST, i);
  const lastName = pick(LAST, i);
  const middleName = pick(MIDDLE, i);
  const gender = i % 2 === 0 ? "FEMALE" : "MALE";
  const city = pick(CITIES, i);
  const state = "Texas";
  const enrolled = i % 5 !== 0;
  const active = i % 9 !== 0;
  const highRisk = i % 4 === 0;
  const year = 1940 + ((i * 7) % 60);
  const month = pad((i % 12) + 1, 2);
  const day = pad((i % 27) + 1, 2);
  const dob = `${year}-${month}-${day}`;
  const phone = `713555${pad(1000 + i, 4)}`;
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
  const street = `${100 + i * 3} ${pick(["Oak", "Elm", "Main", "Cedar", "Pine", "Maple"], i)} St`;
  const zip = `77${pad(((i * 13) % 999) + 1, 3)}`;

  const present = { streetName: street, city, state, zip };
  const permanent =
    i % 3 === 0
      ? { ...present }
      : {
          streetName: `${200 + i * 2} ${pick(["Birch", "Willow", "Ash"], i)} Ave`,
          city: pick(CITIES, i + 2),
          state,
          zip: `77${pad(((i * 17) % 999) + 1, 3)}`,
        };

  return {
    id: `p-${pad(i + 1)}`,
    firstName,
    middleName,
    lastName,
    preferredName: i % 6 === 0 ? firstName.slice(0, 3) : "",
    gender,
    dob,
    profilePic: "",

    email,
    countryCode: "+1",
    phoneNumber: phone,
    homeCountryCode: i % 2 === 0 ? "+1" : "",
    homePhoneNumber: i % 2 === 0 ? `281555${pad(2000 + i, 4)}` : "",
    workCountryCode: "",
    workPhoneNumber: "",

    country: "United States",
    state,
    city,
    zipCode: zip,
    location: `${street}, ${city}, ${state} ${zip}`,
    latitude: (29.5 + (i % 20) * 0.02).toFixed(4),
    longitude: (-95.6 + (i % 20) * 0.03).toFixed(4),
    placeId: `place_${pad(i + 1)}`,
    presentAddress: present,
    permanentAddress: permanent,

    organizationId: pick(ORGANIZATIONS, i).id,
    locationId: [pick(LOCATIONS, i).id],
    agencyId: pick(AGENCIES, i).id,
    groupId: pick(GROUPS, i).id,
    roleId: pick(ROLES, i).id,
    center: [pick(LOCATIONS, i + 1).id],

    services: Array.from(
      new Set([pick(SERVICES, i).id, pick(SERVICES, i + 2).id]),
    ),

    residenceType: pick(RESIDENCE_TYPES, i),
    preferredCaregiverId: [pick(CAREGIVERS, i).id],
    notPreferredCaregiverId: i % 3 === 0 ? [pick(CAREGIVERS, i + 3).id] : [],
    orientCaregiverId: i % 2 === 0 ? pick(CAREGIVERS, i + 1).id : null,
    primaryLanguage: pick(LANGUAGES, i),
    secondaryLanguage: i % 4 === 0 ? pick(LANGUAGES, i + 1) : "",
    language: pick(LANGUAGES, i),
    relationship: pick(RELATIONSHIPS, i),
    martialStatus: pick(MARITAL_STATUSES, i),

    emergencyContact1FirstName: pick(FIRST, i + 5),
    emergencyContact1MiddleName: "",
    emergencyContact1LastName: lastName,
    emergencyContact1Relationship: pick(RELATIONSHIPS, i + 2),
    emergencyContact1Phone: `832555${pad(3000 + i, 4)}`,
    emergencyContact1CountryCode: "+1",
    emergencyContact1HomeCountryCode: "",
    emergencyContact1HomePhone: "",
    emergencyContact1WorkCountryCode: "",
    emergencyContact1WorkPhone: "",
    emergencyContact1HcaType: pick(HCA_TYPES, i),
    emergencyContact1email: `${pick(FIRST, i + 5).toLowerCase()}@example.com`,
    emergencyContact1Instructions: "Call before arrival.",

    emergencyContact2FirstName: i % 2 === 0 ? pick(FIRST, i + 8) : "",
    emergencyContact2MiddleName: "",
    emergencyContact2LastName: i % 2 === 0 ? lastName : "",
    emergencyContact2Relationship: i % 2 === 0 ? pick(RELATIONSHIPS, i + 4) : "",
    emergencyContact2Phone: i % 2 === 0 ? `469555${pad(4000 + i, 4)}` : "",
    emergencyContact2CountryCode: i % 2 === 0 ? "+1" : "",
    emergencyContact2HomeCountryCode: "",
    emergencyContact2HomePhone: "",
    emergencyContact2WorkCountryCode: "",
    emergencyContact2WorkPhone: "",
    emergencyContact2HcaType: i % 2 === 0 ? pick(HCA_TYPES, i + 1) : "",
    emergencyContact2email: "",
    emergencyContact2Instructions: "",

    careCircle:
      i % 3 === 0
        ? [
            {
              id: `cc-${pad(i + 1)}-1`,
              firstName: pick(FIRST, i + 6),
              middleName: "",
              lastName,
              relationship: "Son",
              email: "",
              countryCode: "+1",
              phone: `713555${pad(5000 + i, 4)}`,
            },
            {
              id: `cc-${pad(i + 1)}-2`,
              firstName: pick(FIRST, i + 9),
              middleName: "",
              lastName,
              relationship: "Daughter",
              email: "",
              countryCode: "+1",
              phone: `713555${pad(6000 + i, 4)}`,
            },
          ]
        : [],

    mrnNumber: `MRN-${1000 + i}`,
    homeInstruction: "Gate code #1234. Dog on premises.",
    notes: highRisk ? "Requires wheelchair-accessible vehicle." : "",
    LockboxCode: i % 3 === 0,
    highRisk,

    socialSecurity: `${pad(100 + (i % 899), 3)}-${pad((i % 99) + 1, 2)}-${pad(1000 + i, 4)}`,
    password: "",

    status: active ? "ACTIVE" : "INACTIVE",
    isFirstLogin: i % 7 === 0,
    isProfileCompleted: i % 3 !== 0,
    isProfileVerified: i % 4 !== 0,
    enrollmentStatus: enrolled,
    requiresPasswordReset: i % 8 === 0,
    isLoggedIn: false,

    userId: 5000 + i,
    sharedResidenceMrnId: null,

    createdAt: new Date(2024, (i % 12), (i % 27) + 1).toISOString(),
  };
}

export function seedParticipants(): Participant[] {
  return Array.from({ length: 28 }, (_, i) => makeParticipant(i));
}

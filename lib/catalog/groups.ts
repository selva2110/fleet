import { Participant } from "@/lib/participant/types";

export const MEAL_OPTIONS = [
  { value: "MID-DAY MEAL", label: "Mid-Day Meal" },
  { value: "DINNER", label: "Dinner" },
];

export const DIET_OPTIONS = [
  { value: "LOW SALT", label: "Low Salt" },
  { value: "DIABETIC", label: "Diabetic" },
  { value: "LOW CARB", label: "Low Carbs" },
];

export const MEAL_KEY_VALUE = {
  "MID-DAY MEAL": "Mid-Day Meal",
  "DINNER": "Dinner",
};

export const DIET_KEY_VALUE = {
  "LOW SALT": "Low Salt",
  DIABETIC: "Diabetic",
  "LOW CARB": "Low Carbs",
};

export interface GroupMember {
  participantId: string;
  name: string;
  mealType: string;
  dietType: string;
  medicalNotes: string;
}

export interface GroupRecord {
  id: string;
  name: string;
  mealType: string;
  dietType: string;
  mealNotes: string;
  medicalNotes: string;
  members: GroupMember[];
}

export interface GroupForm {
  id: string;
  name: string;
  mealOption: string;
  dietPlan: string;
  mealNotes: string;
  medicalNotes: string;
  typeId: number;
  memberIds: string[];
}
export interface ParticipantMealForm {
  participantId: string;
  mealOption: string;
  dietPlan: string;
  mealNotes: string;
  medicalNotes: string;
}

const MOCK_GROUP_NAMES = [
  "Diabetic-Friendly Group",
  "Vegetarian Group",
  "Regular Group",
];

export function buildMockParticipantGroups(
  participants: Participant[],
): GroupRecord[] {
  if (participants.length === 0) return [];

  const chunks: Participant[][] = [];
  const chunkSize = Math.max(2, Math.ceil(participants.length / 3));

  for (let i = 0; i < participants.length; i += chunkSize) {
    chunks.push(participants.slice(i, i + chunkSize));

    if (chunks.length === 3) break;
  }

  return chunks.map((members, idx) => {
    const mealType = MEAL_OPTIONS[idx % MEAL_OPTIONS.length].value;
    const dietType = DIET_OPTIONS[idx % DIET_OPTIONS.length].value;

    return {
      id: `mock-group-${idx + 1}`,
      name: MOCK_GROUP_NAMES[idx] ?? `Group ${idx + 1}`,
      mealType,
      dietType,
      mealNotes: "",
      medicalNotes: "",
      members: members.map((p) => ({
        participantId: p.id,
        name: p.name,
        mealType,
        dietType,
        medicalNotes: "",
      })),
    };
  });
}

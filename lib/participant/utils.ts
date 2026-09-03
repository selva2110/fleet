import { ParticipantForm } from "./types";

export class ParticipantUtils {
  static personalDetails() {
    return {
      name: "",
      phone: "",
      dialCode: "",
      address: "",
      location: null,
      relation: "",
    };
  }

  static participantBlank(): ParticipantForm {
    return {
      name: "",
      phone: "",
      dialCode: "",
      bloodGroup: "",
      emergencyContactDetails: ParticipantUtils.personalDetails(),
      companionNeeded: false,
      companionDetails: ParticipantUtils.personalDetails(),
      address: "",
      medicalNotes: "",
      constraints: {},
      maxTravelMinutes: 40,
      routeNotes: "",
      eventId: null,
      location: null,
    };
  }
}

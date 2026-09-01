"use server";

import * as driversApi from "@/lib/api/drivers";

export async function manageLeaveApproval(
  driverId: string,
  ptoId: string,
  status: string,
  reviewNotes = "",
  _actorRole = "dispatcher",
) {
  return driversApi.manageLeaveApproval(driverId, ptoId, status, reviewNotes);
}

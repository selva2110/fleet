export type CareStatus = "ACTIVE" | "INACTIVE";

export interface CareItemType {
  id: string;
  code: string;
  name: string;
  description: string;
  status: CareStatus;
}

export type CareItemForm = {
  id: string;
  type_id: string;
  name: string;
  description: string;
  status: CareStatus;
};

export interface CareItemTypeResponse {
  success: boolean;
  message: string;
  data: {
    content: CareItemType[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
}

export interface CareItemResponse {
  success: boolean;
  message: string;
  data: {
    content: CareItem[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
}

export type CareItemTypeForm = Omit<
  CareItemType,
  "id" | "createdAt" | "updatedAt"
>;

export interface CareItem {
  id: string;
  name: string;
  description: string;
  status: CareStatus;
  type: Omit<CareItemType, "description" | "status">;
}

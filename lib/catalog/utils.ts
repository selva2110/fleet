import {
    CareItem,
  CareItemForm,
  CareItemType,
  CareItemTypeForm,
  CareStatus,
} from "./types";

export class CatalogUtils {
  static careItemTypesOptions(items: CareItemType[]) {
    return items.map((item) => ({
      label: item.name,
      value: item.id,
    }));
  }
  
  static careItemOptions(items: CareItem[]) {
    return items.map((item) => ({
      label: item.name,
      value: item.id,
    }));
  }

  static blankCareItemForm(): CareItemForm {
    return {
      id: "",
      type_id: "",
      name: "",
      description: "",
      status: "ACTIVE" as CareStatus,
    };
  }

  static blankCareItemTypeForm(): CareItemTypeForm {
    return {
      code: "",
      name: "",
      description: "",
      status: "ACTIVE",
    };
  }
}

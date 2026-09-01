import { UserForm } from "./types";

export class UserUtils {
  static blankUser(roleOption:string): UserForm {
    return {
      name: "",
      email: "",
      address: "",
      roleIds: roleOption ? [Number(roleOption)] : [],
      bloodGroup:"",
      centerId:"",
      emergencyContactName:"",
      emergencyContactPhone:"",
      phone:"",
      status: true,
      password: "",
      confirmPassword: "",
    };
  }
}

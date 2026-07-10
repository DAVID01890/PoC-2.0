//Include Both Helper File with needed methods
import { postJwtRegister } from "../../../helpers/fakebackend_helper";

// action
import {
  registerUserSuccessful,
  registerUserFailed,
  resetRegisterFlagChange,
} from "./reducer";

// Is user register successful then direct plot user in redux.
export const registerUser = (user: any) => async (dispatch: any) => {
  try {
    // Backend RegisterRequest expects: { name, email, password }
    const payload = {
      name: user.first_name,
      email: user.email,
      password: user.password,
    };

    const response: any = await postJwtRegister("/auth/register", payload);

    if (response && response.access_token) {
      dispatch(registerUserSuccessful({ user: response.user } as any));
    } else {
      dispatch(registerUserFailed("Registration failed" as any));
    }
  } catch (error: any) {
    dispatch(registerUserFailed(error));
  }
};

export const resetRegisterFlag = () => {
  try {
    const response = resetRegisterFlagChange();
    return response;
  } catch (error) {
    return error;
  }
};
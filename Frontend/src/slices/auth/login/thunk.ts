//Include Both Helper File with needed methods
import { postJwtLogin } from "../../../helpers/fakebackend_helper";
import { setAuthorization } from "../../../helpers/api_helper";

import { loginSuccess, logoutUserSuccess, apiError, reset_login_flag } from './reducer';

export const loginUser = (user: any, history: any) => async (dispatch: any) => {
  try {
    const response: any = await postJwtLogin({
      email: user.email,
      password: user.password,
    });

    if (response && response.access_token) {
      // Store the full auth response (includes access_token and user)
      sessionStorage.setItem("authUser", JSON.stringify(response));
      // Set authorization header for subsequent requests
      setAuthorization(response.access_token);
      dispatch(loginSuccess(response.user || response));
      history('/home');
    } else {
      dispatch(apiError({ data: "Unexpected response from server" }));
    }
  } catch (error: any) {
    dispatch(apiError({ data: error || "Login failed" }));
  }
};

export const logoutUser = () => async (dispatch: any) => {
  try {
    sessionStorage.removeItem("authUser");
    dispatch(logoutUserSuccess(true));
  } catch (error) {
    dispatch(apiError(error));
  }
};

export const socialLogin = (type: any, history: any) => async (dispatch: any) => {
  // Social login not implemented with real backend
  dispatch(apiError({ data: "Social login is not supported yet" }));
};

export const resetLoginFlag = () => async (dispatch: any) => {
  try {
    const response = dispatch(reset_login_flag());
    return response;
  } catch (error) {
    dispatch(apiError(error));
  }
};
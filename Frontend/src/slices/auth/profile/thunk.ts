//Include Both Helper File with needed methods
import { updateProfile } from "../../../helpers/fakebackend_helper";

import { profileSuccess, profileError, resetProfileFlagChange } from "./reducer";

export const editProfile = (user : any) => async (dispatch : any) => {
    try {
        const payload: any = {
            name: user.name,
            avatar: user.avatar,
        };
        if (user.password) {
            payload.password = user.password;
        }
        const data: any = await updateProfile(payload);

        if (data) {
            const authUserStr = sessionStorage.getItem("authUser");
            if (authUserStr) {
                const authUser = JSON.parse(authUserStr);
                if (authUser.user) {
                    authUser.user.name = data.name;
                    authUser.user.avatar = data.avatar;
                }
                sessionStorage.setItem("authUser", JSON.stringify(authUser));
            }
            dispatch(profileSuccess(data));
        }
    } catch (error) {
        dispatch(profileError(error));
    }
};

export const resetProfileFlag = () => {
    try {
        const response = resetProfileFlagChange();
        return response;
    } catch (error) {
        return error;
    }
};
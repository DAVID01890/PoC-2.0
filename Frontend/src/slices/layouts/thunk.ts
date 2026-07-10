import { changeHTMLAttribute, updateLocalStorage } from './utils';
import {
    changeLayoutAction,
    changeLayoutThemeAction,
    changeLayoutThemeColorAction,
    changeLayoutModeAction,
    changeSidebarThemeAction,
    changeLayoutWidthAction,
    changeLayoutPositionAction,
    changeTopbarThemeAction,
    changeLeftsidebarSizeTypeAction,
    changeLeftsidebarViewTypeAction,
    changeSidebarImageTypeAction,
    changePreLoaderAction,
    changeSidebarVisibilityAction
} from './reducer';

/**
 * Changes the layout type
 * @param {*} param0
 */
export const changeLayout = (layout: any) => async (dispatch: any) => {
    try {
        if (layout === "twocolumn") {
            document.documentElement.removeAttribute("data-layout-width");
        } else if (layout === "horizontal") {
            document.documentElement.removeAttribute("data-sidebar-size");
        } else if (layout === "semibox") {
            changeHTMLAttribute("data-layout-width", "fluid");
            changeHTMLAttribute("data-layout-style", "default");
        }
        changeHTMLAttribute("data-layout", layout);
        updateLocalStorage("layout-config", { layoutType: layout });
        dispatch(changeLayoutAction(layout));
    } catch (error) { }
};

/**
 * Changes the layout mode
 * @param {*} param0
 */
export const changeLayoutMode = (layoutMode: any) => async (dispatch: any) => {
    try {
        changeHTMLAttribute("data-bs-theme", layoutMode);
        updateLocalStorage("layout-config", { layoutModeType: layoutMode });
        dispatch(changeLayoutModeAction(layoutMode));
    } catch (error) { }
};

/**
 * Changes the layout theme version
 * @param {*} param0
 */
// export const changeLayoutTheme = (layoutTheme : any) => async (dispatch : any) => {
//     console.log('layoutTheme: ', layoutTheme);
//     try {
//         changeHTMLAttribute("data-theme", layoutTheme);
//         dispatch(changeLayoutThemeAction(layoutTheme));
//     } catch (error) { }
// };


export const changeLayoutTheme = (layoutTheme: any) => async (dispatch: any) => {
    try {
        dispatch(changeLayoutMode("light"))
        if (layoutTheme === "galaxy") {
            dispatch(changeLayoutMode("dark"))
        }
        changeHTMLAttribute("data-theme", layoutTheme);
        updateLocalStorage("layout-config", { layoutThemeType: layoutTheme });
        dispatch(changeLayoutThemeAction(layoutTheme));
    } catch (error) { }
};

/**
 * Changes the layout theme color
 * @param {*} param0
 */
export const changeLayoutThemeColor = (layoutThemeColor: any) => async (dispatch: any) => {
    try {
        changeHTMLAttribute("data-theme-colors", layoutThemeColor);
        updateLocalStorage("layout-config", { layoutThemeColorType: layoutThemeColor });
        dispatch(changeLayoutThemeColorAction(layoutThemeColor));
    } catch (error) { }
};

/**
 * Changes the left sidebar theme
 * @param {*} param0
 */
export const changeSidebarTheme = (theme: any) => async (dispatch: any) => {
    try {
        changeHTMLAttribute("data-sidebar", theme);
        updateLocalStorage("layout-config", { leftSidebarType: theme });
        dispatch(changeSidebarThemeAction(theme));
    } catch (error) {
        // console.log(error);
    }
};

/**
 * Changes the layout width
 * @param {*} param0
 */
export const changeLayoutWidth = (layoutWidth: any) => async (dispatch: any) => {
    try {
        if (layoutWidth === 'lg') {
            changeHTMLAttribute("data-layout-width", "fluid");
        } else {
            changeHTMLAttribute("data-layout-width", "boxed");
        }
        updateLocalStorage("layout-config", { layoutWidthType: layoutWidth });
        dispatch(changeLayoutWidthAction(layoutWidth));
    } catch (error) {
        return error;
    }
};

/**
 * Changes the layout position
 * @param {*} param0
 */
export const changeLayoutPosition = (layoutposition: any) => async (dispatch: any) => {
    try {
        changeHTMLAttribute("data-layout-position", layoutposition);
        updateLocalStorage("layout-config", { layoutPositionType: layoutposition });
        dispatch(changeLayoutPositionAction(layoutposition));
    } catch (error) {
        // console.log(error);
    }
};

/**
 * Changes the topbar themes
 * @param {*} param0
 */
export const changeTopbarTheme = (topbarTheme: any) => async (dispatch: any) => {
    try {
        changeHTMLAttribute("data-topbar", topbarTheme);
        updateLocalStorage("layout-config", { topbarThemeType: topbarTheme });
        dispatch(changeTopbarThemeAction(topbarTheme));

    } catch (error) {
        // console.log(error);
    }
};

/**
 * Changes the topbar themes
 * @param {*} param0
 */
export const changeSidebarImageType = (leftsidebarImagetype: any) => async (dispatch: any) => {
    try {
        changeHTMLAttribute("data-sidebar-image", leftsidebarImagetype);
        updateLocalStorage("layout-config", { leftSidebarImageType: leftsidebarImagetype });
        dispatch(changeSidebarImageTypeAction(leftsidebarImagetype));
    } catch (error) {
        // console.log(error);
    }
};

/**
 * Changes the Preloader
 * @param {*} param0
 */
export const changePreLoader = (preloaderTypes: any) => async (dispatch: any) => {
    try {
        changeHTMLAttribute("data-preloader", preloaderTypes);
        updateLocalStorage("layout-config", { preloader: preloaderTypes });
        dispatch(changePreLoaderAction(preloaderTypes));
    } catch (error) {
        // console.log(error);
    }
};

/**
 * Changes the topbar themes
 * @param {*} param0
 */
export const changeLeftsidebarSizeType = (leftsidebarSizetype: any) => async (dispatch: any) => {
    try {
        switch (leftsidebarSizetype) {
            case 'lg':
                changeHTMLAttribute("data-sidebar-size", "lg");
                break;
            case 'md':
                changeHTMLAttribute("data-sidebar-size", "md");
                break;
            case "sm":
                changeHTMLAttribute("data-sidebar-size", "sm");
                break;
            case "sm-hover":
                changeHTMLAttribute("data-sidebar-size", "sm-hover");
                break;
            default:
                changeHTMLAttribute("data-sidebar-size", "lg");
        }
        updateLocalStorage("layout-config", { leftsidbarSizeType: leftsidebarSizetype });
        dispatch(changeLeftsidebarSizeTypeAction(leftsidebarSizetype));

    } catch (error) {
        // console.log(error);
    }
};

/**
 * Changes the topbar themes
 * @param {*} param0
 */
export const changeLeftsidebarViewType = (leftsidebarViewtype: any) => async (dispatch: any) => {
    try {
        changeHTMLAttribute("data-layout-style", leftsidebarViewtype);
        updateLocalStorage("layout-config", { leftSidebarViewType: leftsidebarViewtype });
        dispatch(changeLeftsidebarViewTypeAction(leftsidebarViewtype));
    } catch (error) {
        // console.log(error);
    }
};

/**
 * Changes the sidebar visibility
 * @param {*} param0
 */
export const changeSidebarVisibility = (sidebarVisibilitytype: any) => async (dispatch: any) => {
    try {
        changeHTMLAttribute("data-sidebar-visibility", sidebarVisibilitytype);
        updateLocalStorage("layout-config", { sidebarVisibilitytype: sidebarVisibilitytype });
        dispatch(changeSidebarVisibilityAction(sidebarVisibilitytype));
    } catch (error) { }
};
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SimpleBar from "simplebar-react";
import { useSelector } from "react-redux";
import { createSelector } from "reselect";
import logoSm from "../assets/images/logo-sm.png";
import logoDark from "../assets/images/logo-dark.png";
import logoLight from "../assets/images/logo-light.png";
import { getAvatarSrc } from "../helpers/avatar_helper";
import VerticalLayout from "./VerticalLayouts";
import TwoColumnLayout from "./TwoColumnLayout";
import { Container, DropdownMenu, DropdownToggle, UncontrolledDropdown } from "reactstrap";
import HorizontalLayout from "./HorizontalLayout";

const getAuthUser = () => {
    try {
        const raw = sessionStorage.getItem("authUser");
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed.user || parsed.data || parsed;
    } catch {
        return null;
    }
};

const Sidebar = ({ layoutType }: any) => {
  const [userName, setUserName] = useState("Usuario");
  const [userAvatar, setUserAvatar] = useState<string>(getAvatarSrc("1"));

  const profileState = createSelector(
    (state: any) => state.Profile,
    (profile) => profile.user
  );
  const profileUser = useSelector(profileState);

  useEffect(() => {
    const authUser = getAuthUser();
    if (authUser) {
      const name = authUser.name || authUser.first_name || authUser.username || "Usuario";
      setUserName(name);
      setUserAvatar(getAvatarSrc(authUser.avatar));
    }
  }, [profileUser]);

  useEffect(() => {
    var verticalOverlay = document.getElementsByClassName("vertical-overlay");
    if (verticalOverlay) {
      verticalOverlay[0].addEventListener("click", function () {
        document.body.classList.remove("vertical-sidebar-enable");
      });
    }
  });

  const addEventListenerOnSmHoverMenu = () => {
    if (document.documentElement.getAttribute('data-sidebar-size') === 'sm-hover') {
      document.documentElement.setAttribute('data-sidebar-size', 'sm-hover-active');
    } else if (document.documentElement.getAttribute('data-sidebar-size') === 'sm-hover-active') {
      document.documentElement.setAttribute('data-sidebar-size', 'sm-hover');
    } else {
      document.documentElement.setAttribute('data-sidebar-size', 'sm-hover');
    }
  };

  return (
    <React.Fragment>
      <div className="app-menu navbar-menu">
        <div className="navbar-brand-box">
          <Link to="/home" className="logo logo-light text-white d-flex align-items-center justify-content-center h-100 w-100 text-center" style={{ textDecoration: 'none' }}>
            <span className="logo-sm">
              <i className="ri-home-4-line fs-20"></i>
            </span>
            <span className="logo-lg">
              <span className="fw-semibold" style={{ fontSize: '16px' }}>Inicio</span>
            </span>
          </Link>
          <button
            onClick={addEventListenerOnSmHoverMenu}
            type="button"
            className="btn btn-sm p-0 fs-20 header-item float-end btn-vertical-sm-hover"
            id="vertical-hover"
          >
            <i className="ri-record-circle-line"></i>
          </button>
        </div>

        <UncontrolledDropdown className="sidebar-user m-1 rounded">
          <DropdownToggle tag="button" type="button" className="btn material-shadow-none" id="page-header-user-dropdown">
            <span className="d-flex align-items-center gap-2">
              <img className="rounded header-profile-user" src={userAvatar} alt="Header Avatar" />
                <span className="text-start">
                  <span className="d-block fw-medium sidebar-user-name-text">{userName}</span>
                  <span className="d-block fs-14 sidebar-user-name-sub-text"><i className="ri ri-circle-fill fs-10 text-success align-baseline"></i> <span className="align-middle">Online</span></span>
                </span>
            </span>
          </DropdownToggle>
          <DropdownMenu className="dropdown-menu-end">
            <h6 className="dropdown-header">Bienvenido {userName}!</h6>
            <a className="dropdown-item" href="/profile"><i className="mdi mdi-account-circle text-muted fs-16 align-middle me-1"></i> <span className="align-middle">Perfil</span></a>
            <a className="dropdown-item" href="/logout"><i className="mdi mdi-logout text-muted fs-16 align-middle me-1"></i> <span className="align-middle" data-key="t-logout">Cerrar Sesión</span></a>
          </DropdownMenu>
        </UncontrolledDropdown>
        {layoutType === "horizontal" ? (
          <div id="scrollbar">
            <Container fluid>
              <div id="two-column-menu"></div>
              <ul className="navbar-nav" id="navbar-nav">
                <HorizontalLayout />
              </ul>
            </Container>
          </div>
        ) : layoutType === 'twocolumn' ? (
          <React.Fragment>
            <TwoColumnLayout layoutType={layoutType} />
            <div className="sidebar-background"></div>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <SimpleBar id="scrollbar" className="h-100">
              <Container fluid>
                <div id="two-column-menu"></div>
                <ul className="navbar-nav" id="navbar-nav">
                  <VerticalLayout layoutType={layoutType} />
                </ul>
              </Container>
            </SimpleBar>
            <div className="sidebar-background"></div>
          </React.Fragment>
        )}
      </div>
      <div className="vertical-overlay"></div>
    </React.Fragment>
  );
};

export default Sidebar;

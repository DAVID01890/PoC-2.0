import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap';
import { createSelector } from 'reselect';
import { useSelector } from 'react-redux';

import { getAvatarSrc } from '../../helpers/avatar_helper';
import UserProfile from '../../pages/Authentication/user-profile';

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

const ProfileDropdown = () => {

    const profiledropdownData = createSelector(
        (state: any) => state.Profile,
        (user) => user.user
    );
    const user = useSelector(profiledropdownData);

    const [userName, setUserName] = useState("Admin");
    const [userAvatar, setUserAvatar] = useState<string>(getAvatarSrc("1"));
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    useEffect(() => {
        const authUser = getAuthUser();
        if (authUser) {
            const name = authUser.name || authUser.first_name || authUser.username || "Admin";
            setUserName(name);
            setUserAvatar(getAvatarSrc(authUser.avatar));
        }
    }, [user]);

    const [isProfileDropdown, setIsProfileDropdown] = useState(false);
    const toggleProfileDropdown = () => {
        setIsProfileDropdown(!isProfileDropdown);
    };
    return (
        <React.Fragment>
            <Dropdown isOpen={isProfileDropdown} toggle={toggleProfileDropdown} className="ms-sm-3 header-item topbar-user">
                <DropdownToggle tag="button" type="button" className="btn">
                    <span className="d-flex align-items-center">
                        <img className="rounded-circle header-profile-user" src={userAvatar}
                            alt="Header Avatar" />
                        <span className="text-start ms-xl-2">
                            <span className="d-none d-xl-inline-block ms-1 fw-medium user-name-text"> {userName}</span>
                        </span>
                    </span>
                </DropdownToggle>
                <DropdownMenu className="dropdown-menu-end">
                    <h6 className="dropdown-header">Bienvenido {userName}!</h6>
                    <DropdownItem onClick={() => setIsProfileModalOpen(true)}>
                        <i className="mdi mdi-account-circle text-muted fs-16 align-middle me-1"></i>
                        <span className="align-middle">Perfil</span>
                    </DropdownItem>
                    <DropdownItem tag={Link} to="/logout">
                        <i className="mdi mdi-logout text-muted fs-16 align-middle me-1"></i>
                        <span className="align-middle" data-key="t-logout">Cerrar Sesión</span>
                    </DropdownItem>
                </DropdownMenu>
            </Dropdown>

            <UserProfile isOpen={isProfileModalOpen} toggle={() => setIsProfileModalOpen(false)} />
        </React.Fragment>
    );
};

export default ProfileDropdown;
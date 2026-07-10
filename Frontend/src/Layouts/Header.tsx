import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Dropdown, DropdownMenu, DropdownToggle, Form, DropdownItem } from 'reactstrap';
import { getProjects } from '../helpers/fakebackend_helper';

//import images
import logoSm from "../assets/images/logo-sm.png";
import logoDark from "../assets/images/logo-dark.png";
import logoLight from "../assets/images/logo-light.png";

//import Components
import FullScreenDropdown from '../Components/Common/FullScreenDropdown';
import NotificationDropdown from '../Components/Common/NotificationDropdown';
import ProfileDropdown from '../Components/Common/ProfileDropdown';
import LightDark from '../Components/Common/LightDark';

import { changeSidebarVisibility } from '../slices/thunks';
import { useSelector, useDispatch } from "react-redux";
import { createSelector } from 'reselect';

const Header = ({ onChangeLayoutMode, layoutModeType, headerClass, toggleRightSidebar } : any) => {
    const dispatch : any = useDispatch();
    const location = useLocation();
    const navigate = useNavigate();
    const [projects, setProjects] = useState<any[]>([]);
    const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
    const toggleProjectDropdown = () => setProjectDropdownOpen(!projectDropdownOpen);

    const [currentProjectName, setCurrentProjectName] = useState<string>("");

    useEffect(() => {
        const match = location.pathname.match(/\/projects\/([a-f0-9-]+)/);
        if (match && match[1]) {
            const pId = match[1];
            localStorage.setItem("activeProjectId", pId);
            const currentProj = projects.find((p: any) => p.id === pId);
            if (currentProj) {
                setCurrentProjectName(currentProj.nombre);
                localStorage.setItem("activeProjectName", currentProj.nombre);
            } else {
                setCurrentProjectName(localStorage.getItem("activeProjectName") || "Cargando...");
            }
        } else {
            setCurrentProjectName("Seleccionar Proyecto");
            localStorage.removeItem("activeProjectId");
            localStorage.removeItem("activeProjectName");
        }
    }, [location, projects]);

    const isProjectPage = !!location.pathname.match(/^\/projects\/[^\/]+/);

    const selectDashboardData = createSelector(
        (state) => state.Layout,
        (sidebarVisibilitytype) => sidebarVisibilitytype.sidebarVisibilitytype
      );
    // Inside your component
    const sidebarVisibilitytype = useSelector(selectDashboardData);

    useEffect(() => {
        const getStoredOrder = (): string[] => {
            try { const r = localStorage.getItem('projectsOrder'); return r ? JSON.parse(r) : []; } catch { return []; }
        };
        const applyOrder = (all: any[], order: string[]): any[] => {
            if (!order.length) return all;
            const map = new Map(all.map(p => [p.id, p]));
            const ordered: any[] = [];
            order.forEach(id => { if (map.has(id)) ordered.push(map.get(id)); });
            all.forEach(p => { if (!order.includes(p.id)) ordered.unshift(p); });
            return ordered;
        };

        const fetchProjects = async () => {
            try {
                const response: any = await getProjects();
                const all = response.proyectos || response || [];
                setProjects(applyOrder(all, getStoredOrder()));
            } catch (err) {
                console.error("Error fetching projects for header dropdown", err);
            }
        };
        fetchProjects();

        const handleOrderChanged = () => fetchProjects();
        window.addEventListener('projectOrderChanged', handleOrderChanged);
        window.addEventListener('projectDataChanged', handleOrderChanged);
        return () => {
            window.removeEventListener('projectOrderChanged', handleOrderChanged);
            window.removeEventListener('projectDataChanged', handleOrderChanged);
        };
    }, []);

    const handleSelectProject = (project: any) => {
        const activeProjectId = localStorage.getItem("activeProjectId");
        if (project.id === activeProjectId) {
            return;
        }
        localStorage.setItem("activeProjectId", project.id);
        localStorage.setItem("activeProjectName", project.nombre);
        navigate(`/projects/${project.id}/backlog`);
        window.location.reload();
    };

    const toogleMenuBtn = () => {
        var windowSize = document.documentElement.clientWidth;
        dispatch(changeSidebarVisibility("show"));

        //For collapse horizontal menu
        if (document.documentElement.getAttribute('data-layout') === "horizontal") {
            document.body.classList.contains("menu") ? document.body.classList.remove("menu") : document.body.classList.add("menu");
        }

        //For collapse vertical and semibox menu
        if (sidebarVisibilitytype === "show" && (document.documentElement.getAttribute('data-layout') === "vertical" || document.documentElement.getAttribute('data-layout') === "semibox")) {
            if (windowSize < 1025 && windowSize > 767) {
                document.body.classList.remove('vertical-sidebar-enable');
                (document.documentElement.getAttribute('data-sidebar-size') === 'sm') ? document.documentElement.setAttribute('data-sidebar-size', '') : document.documentElement.setAttribute('data-sidebar-size', 'sm');
            } else if (windowSize > 1025) {
                document.body.classList.remove('vertical-sidebar-enable');
                (document.documentElement.getAttribute('data-sidebar-size') === 'lg') ? document.documentElement.setAttribute('data-sidebar-size', 'sm') : document.documentElement.setAttribute('data-sidebar-size', 'lg');
            } else if (windowSize <= 767) {
                document.body.classList.add('vertical-sidebar-enable');
                document.documentElement.setAttribute('data-sidebar-size', 'lg');
            }
        }


        //Two column menu
        if (document.documentElement.getAttribute('data-layout') === "twocolumn") {
            document.body.classList.contains('twocolumn-panel') ? document.body.classList.remove('twocolumn-panel') : document.body.classList.add('twocolumn-panel');
        }
    };

    return (
        <React.Fragment>
            <header id="page-topbar" className={headerClass} style={!isProjectPage ? { left: 0 } : undefined}>
                <div className="layout-width">
                    <div className="navbar-header">
                        <div className="d-flex">
                            <Link to="/home" className="btn btn-icon btn-topbar btn-ghost-secondary rounded-circle d-flex align-items-center justify-content-center align-self-center me-2">
                                <i className="ri-home-4-line fs-22"></i>
                            </Link>

                            <div className="navbar-brand-box horizontal-logo">
                                <Link to="/" className="logo logo-dark">
                                    <span className="logo-sm">
                                        <img src={logoSm} alt="Luma" height="22" />
                                    </span>
                                    <span className="logo-lg">
                                        <img src={logoDark} alt="Luma" height="17" />
                                    </span>
                                </Link>

                                <Link to="/" className="logo logo-light">
                                    <span className="logo-sm">
                                        <img src={logoSm} alt="Luma" height="22" />
                                    </span>
                                    <span className="logo-lg">
                                        <img src={logoLight} alt="Luma" height="17" />
                                    </span>
                                </Link>
                            </div>



                            {/* Project Switcher Dropdown */}
                            {isProjectPage && (
                                <Dropdown isOpen={projectDropdownOpen} toggle={toggleProjectDropdown} className="ms-2 header-item topbar-head-dropdown">
                                    <DropdownToggle tag="button" className="btn header-item text-start d-flex align-items-center gap-2 px-3 text-muted" style={{ background: 'transparent', border: 'none' }}>
                                        <i className="ri-folders-line fs-18 text-muted"></i>
                                        <span className="d-none d-xl-inline-block ms-1 fw-medium text-truncate" style={{ maxWidth: '150px' }}>
                                            {currentProjectName}
                                        </span>
                                        <i className="mdi mdi-chevron-down d-none d-xl-inline-block fs-12 text-muted"></i>
                                    </DropdownToggle>
                                    <DropdownMenu className="dropdown-menu-end">
                                        <DropdownItem header>Cambiar de Proyecto</DropdownItem>
                                        {projects.map((p: any) => {
                                            const isActive = p.id === localStorage.getItem("activeProjectId");
                                            return (
                                                <DropdownItem 
                                                    key={p.id} 
                                                    onClick={() => handleSelectProject(p)}
                                                    disabled={isActive}
                                                    className={isActive ? "text-primary fw-medium" : ""}
                                                >
                                                    <i className="ri-folder-line align-middle me-2 text-muted"></i> {p.nombre}
                                                </DropdownItem>
                                            );
                                        })}
                                        <DropdownItem divider />
                                        <DropdownItem tag={Link} to="/projects">
                                            <i className="ri-list-settings-line align-middle me-2 text-muted"></i> Ver Todos
                                        </DropdownItem>
                                    </DropdownMenu>
                                </Dropdown>
                            )}
                        </div>

                        <div className="d-flex align-items-center">

                            {/* <Dropdown isOpen={search} toggle={toogleSearch} className="d-md-none topbar-head-dropdown header-item">
                                <DropdownToggle type="button" tag="button" className="btn btn-icon btn-topbar btn-ghost-secondary rounded-circle">
                                    <i className="bx bx-search fs-22"></i>
                                </DropdownToggle>
                                <DropdownMenu className="dropdown-menu-lg dropdown-menu-end p-0">
                                    <Form className="p-3">
                                        <div className="form-group m-0">
                                            <div className="input-group">
                                                <input type="text" className="form-control" placeholder="Search ..."
                                                    aria-label="Recipient's username" />
                                                <button className="btn btn-primary" type="submit"><i
                                                    className="mdi mdi-magnify"></i></button>
                                            </div>
                                        </div>
                                    </Form>
                                </DropdownMenu>
                            </Dropdown> */}

                            {/* FullScreenDropdown */}
                            <FullScreenDropdown />

                            {/* Dark/Light Mode set */}
                            <LightDark
                                layoutMode={layoutModeType}
                                onChangeLayoutMode={onChangeLayoutMode}
                            />

                            <div className="ms-1 header-item d-none d-sm-flex">
                                <button
                                    onClick={toggleRightSidebar}
                                    type="button"
                                    className="btn btn-icon btn-topbar btn-ghost-secondary rounded-circle"
                                >
                                    <i className='mdi mdi-cog-outline fs-22'></i>
                                </button>
                            </div>

                            {/* NotificationDropdown */}
                            {/* <NotificationDropdown /> */}

                            {/* ProfileDropdown */}
                            <ProfileDropdown />
                        </div>
                    </div>
                </div>
            </header>
        </React.Fragment>
    );
};

export default Header;
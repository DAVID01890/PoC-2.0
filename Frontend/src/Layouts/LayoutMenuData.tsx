import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

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

const Navdata = () => {
    const history = useNavigate();
    const location = useLocation();
    //state data
    const [isDashboard, setIsDashboard] = useState<boolean>(false);
    const [isAuth, setIsAuth] = useState<boolean>(false);
    const [isPages, setIsPages] = useState<boolean>(false);

    const [iscurrentState, setIscurrentState] = useState('Dashboard');

    function updateIconSidebar(e: any) {
        if (e && e.target && e.target.getAttribute("sub-items")) {
            const ul: any = document.getElementById("two-column-menu");
            const iconItems: any = ul.querySelectorAll(".nav-icon.active");
            let activeIconItems = [...iconItems];
            activeIconItems.forEach((item) => {
                item.classList.remove("active");
                var id = item.getAttribute("sub-items");
                const getID = document.getElementById(id) as HTMLElement;
                if (getID)
                    getID.classList.remove("show");
            });
        }
    }

    useEffect(() => {
        document.body.classList.remove('twocolumn-panel');
        if (iscurrentState !== 'Dashboard') {
            setIsDashboard(false);
        }
        if (iscurrentState !== 'Auth') {
            setIsAuth(false);
        }
        if (iscurrentState !== 'Pages') {
            setIsPages(false);
        }
    }, [
        history,
        iscurrentState,
        isDashboard,
        isAuth,
        isPages,
    ]);

    const match = window.location.pathname.match(/\/projects\/([a-f0-9-]+)/);
    const urlProjectId = match ? match[1] : null;
    const activeProjectId = urlProjectId || localStorage.getItem("activeProjectId");
    const activeProjectName = localStorage.getItem("activeProjectName");

    if (urlProjectId && urlProjectId !== localStorage.getItem("activeProjectId")) {
        localStorage.setItem("activeProjectId", urlProjectId);
    }
    
    const authUser = getAuthUser();
    const isAdmin = authUser && authUser.role === "admin";

    const isInsideProject = window.location.pathname.startsWith("/projects/") && window.location.pathname !== "/projects";

    const menuItems: any = [
        {
            label: "Gestión Scrum",
            isHeader: true,
        },

        {
            id: "projects",
            label: "Proyectos",
            icon: "ri-folders-line",
            link: "/projects",
            click: function (e: any) {
                setIscurrentState('Projects');
                updateIconSidebar(e);
            },
        },
        ...(isInsideProject ? [
            {
                id: "backlog",
                label: "Backlog",
                icon: "ri-list-check-2",
                link: activeProjectId ? `/projects/${activeProjectId}/backlog` : "/projects",
                click: function (e: any) {
                    setIscurrentState('Backlog');
                    updateIconSidebar(e);
                },
            },
            {
                id: "kanban",
                label: "Tablero Kanban",
                icon: "ri-dashboard-line",
                link: activeProjectId ? `/projects/${activeProjectId}/kanban` : "/projects",
                click: function (e: any) {
                    setIscurrentState('Kanban');
                    updateIconSidebar(e);
                },
            },
            {
                id: "project-progress",
                label: "Progreso",
                icon: "ri-bar-chart-box-line",
                link: activeProjectId ? `/projects/${activeProjectId}/progress` : "/projects",
                click: function (e: any) {
                    setIscurrentState('ProjectProgress');
                    updateIconSidebar(e);
                },
            },
            {
                id: "project-team",
                label: "Equipo",
                icon: "ri-team-line",
                link: activeProjectId ? `/projects/${activeProjectId}/team` : "/projects",
                click: function (e: any) {
                    setIscurrentState('ProjectTeam');
                    updateIconSidebar(e);
                },
            },
            {
                id: "project-details",
                label: "Detalles del Proyecto",
                icon: "ri-information-line",
                link: activeProjectId ? `/projects/${activeProjectId}/details` : "/projects",
                click: function (e: any) {
                    setIscurrentState('ProjectDetails');
                    updateIconSidebar(e);
                },
            },
        ] : []),

        ...(isAdmin ? [
            {
                label: "Administración",
                isHeader: true,
            },
            {
                id: "admin-users",
                label: "Usuarios",
                icon: "ri-user-settings-line",
                link: "/admin/users",
                click: function (e: any) {
                    setIscurrentState('AdminUsers');
                    updateIconSidebar(e);
                },
            }
        ] : [])
    ];
    return <React.Fragment>{menuItems}</React.Fragment>;
};
export default Navdata;
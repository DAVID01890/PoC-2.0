import React from "react";
import { Navigate } from "react-router-dom";

//Dashboard
//Starter
import Starter from "../pages/Starter";
import ProjectsList from "../pages/Projects";
import ProjectDetail from "../pages/Projects/ProjectDetail";
import UserStoryDetail from "../pages/Projects/UserStoryDetail";
import SprintDetail from "../pages/Projects/SprintDetail";
import UsersList from "../pages/Admin/UsersList";
import Basic404 from '../pages/AuthenticationInner/Errors/Basic404';
import Cover404 from '../pages/AuthenticationInner/Errors/Cover404';
import Alt404 from '../pages/AuthenticationInner/Errors/Alt404';
import Error500 from '../pages/AuthenticationInner/Errors/Error500';
import Offlinepage from "../pages/AuthenticationInner/Errors/Offlinepage";
// //login
import Login from "../pages/Authentication/Login";
import ForgetPasswordPage from "../pages/Authentication/ForgetPassword";
import Logout from "../pages/Authentication/Logout";
import Register from "../pages/Authentication/Register";

// // User Profile
import UserProfile from "../pages/Authentication/user-profile";



const authProtectedRoutes = [
  { path: "/home", component: <ProjectsList /> },
  { path: "/projects", component: <ProjectsList /> },
  { path: "/projects/:id", component: <ProjectDetail /> },
  { path: "/projects/:id/backlog", component: <ProjectDetail /> },
  { path: "/projects/:id/kanban", component: <ProjectDetail /> },
  { path: "/projects/:id/sprints", component: <ProjectDetail /> },
  { path: "/projects/:id/details", component: <ProjectDetail /> },
  { path: "/projects/:id/team", component: <ProjectDetail /> },
  { path: "/projects/:id/progress", component: <ProjectDetail /> },
  { path: "/projects/:id/stories/:storyId", component: <UserStoryDetail /> },
  { path: "/projects/:id/sprints/:sprintId", component: <SprintDetail /> },
  
  // Admin Routes
  { path: "/admin/users", component: <UsersList /> },
 
 

  //User Profile
  { path: "/profile", component: <UserProfile /> },

  // this route should be at the end of all other routes
  // eslint-disable-next-line react/display-name
  {
    path: "/",
    exact: true,
    component: <Navigate to="/projects" />,
  },
  { path: "*", component: <Navigate to="/projects" /> },
];

const publicRoutes = [
  // Authentication Page
  { path: "/logout", component: <Logout /> },
  { path: "/login", component: <Login /> },
  { path: "/forgot-password", component: <ForgetPasswordPage /> },
  { path: "/register", component: <Register /> },

  { path: "/auth-404-basic", component: <Basic404 /> },
  { path: "/auth-404-cover", component: <Cover404 /> },
  { path: "/auth-404-alt", component: <Alt404 /> },
  { path: "/auth-500", component: <Error500 /> },
  { path: "/auth-offline", component: <Offlinepage /> },

];

export { authProtectedRoutes, publicRoutes };
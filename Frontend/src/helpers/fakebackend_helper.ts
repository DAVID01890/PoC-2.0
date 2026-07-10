import { APIClient } from "./api_helper";

import * as url from "./url_helper";

const api = new APIClient();

// Gets the logged in user data from local session
export const getLoggedInUser = () => {
  const user = localStorage.getItem("user");
  if (user) return JSON.parse(user);
  return null;
};

// //is user is logged in
export const isUserAuthenticated = () => {
  return getLoggedInUser() !== null;
};

// Register Method
export const postFakeRegister = (data : any) => api.create(url.POST_FAKE_REGISTER, data);

// Login Method
export const postFakeLogin = (data : any) => api.create(url.POST_FAKE_LOGIN, data);

// postForgetPwd
export const postFakeForgetPwd = (data : any) => api.create(url.POST_FAKE_PASSWORD_FORGET, data);

// Edit profile
export const postJwtProfile = (data : any) => api.create(url.POST_EDIT_JWT_PROFILE, data);

export const postFakeProfile = (data : any) => api.update(url.POST_EDIT_PROFILE + '/' + data.idx, data);

export const updateProfile = (data : any) => api.put(url.PUT_EDIT_PROFILE, data);

// Register Method
export const postJwtRegister = (url : string, data  :any) => {
  return api.create(url, data)
    .catch(err => {
      var message = err.message || err;
      if (err.response && err.response.status) {
        switch (err.response.status) {
          case 404:
            message = "Sorry! the page you are looking for could not be found";
            break;
          case 500:
            message = "Sorry! something went wrong, please contact our support team";
            break;
          case 401:
            message = "Invalid credentials";
            break;
          default:
            message = err[1] || message;
            break;
        }
      }
      throw message;
    });
};

// Login Method
export const postJwtLogin = (data : any) => api.create(url.POST_FAKE_JWT_LOGIN, data);

// postForgetPwd
export const postJwtForgetPwd = (data : any) => api.create(url.POST_FAKE_JWT_PASSWORD_FORGET, data);

// postSocialLogin
export const postSocialLogin = (data : any) => api.create(url.SOCIAL_LOGIN, data);

// Projects & Scrum API Methods
export const getProjects = () => api.get(url.GET_PROJECTS);
export const createProject = (data: any) => api.create(url.POST_PROJECT, data);
export const getProjectDetail = (id: string) => api.get(`${url.GET_PROJECTS}/${id}`);
export const deleteProject = (id: string) => api.delete(`${url.DELETE_PROJECT}/${id}`);
export const addProjectMember = (id: string, data: any) => api.create(`${url.GET_PROJECTS}/${id}/miembros`, data);
export const deleteProjectMember = (id: string, userId: string) => api.delete(`${url.GET_PROJECTS}/${id}/miembros/${userId}`);
export const updateProject = (id: string, data: any) => api.put(`${url.GET_PROJECTS}/${id}`, data);

export const createSprint = (id: string, data: any) => api.create(`${url.GET_PROJECTS}/${id}/sprints`, data);
export const updateSprint = (id: string, sprintId: string, data: any) => api.put(`${url.GET_PROJECTS}/${id}/sprints/${sprintId}`, data);
export const deleteSprint = (id: string, sprintId: string) => api.delete(`${url.GET_PROJECTS}/${id}/sprints/${sprintId}`);
export const startSprint = (id: string, sprintId: string) => api.create(`${url.GET_PROJECTS}/${id}/sprints/${sprintId}/start`, {});
export const closeSprint = (id: string, sprintId: string) => api.create(`${url.GET_PROJECTS}/${id}/sprints/${sprintId}/close`, {});
export const reopenSprint = (id: string, sprintId: string) => api.create(`${url.GET_PROJECTS}/${id}/sprints/${sprintId}/reopen`, {});
export const assignStoryToSprint = (id: string, data: any) => api.create(`${url.GET_PROJECTS}/${id}/sprints/historias`, data);
export const removeStoryFromSprint = (id: string, sprintId: string, storyId: string) => api.delete(`${url.GET_PROJECTS}/${id}/sprints/${sprintId}/historias/${storyId}`);

export const createUserStory = (id: string, data: any) => api.create(`${url.GET_PROJECTS}/${id}/historias`, data);
export const createTechnicalTask = (id: string, storyId: string, data: any) => api.create(`${url.GET_PROJECTS}/${id}/historias/${storyId}/tareas`, data);
export const startTechnicalTask = (id: string, taskId: string) => api.create(`${url.GET_PROJECTS}/${id}/tareas/${taskId}/start`, {});
export const completeTechnicalTask = (id: string, taskId: string) => api.create(`${url.GET_PROJECTS}/${id}/tareas/${taskId}/complete`, {});
export const updateTechnicalTask = (id: string, taskId: string, data: any) => api.put(`${url.GET_PROJECTS}/${id}/tareas/${taskId}`, data);
export const updateUserStory = (id: string, storyId: string, data: any) => api.put(`${url.GET_PROJECTS}/${id}/historias/${storyId}`, data);
export const deleteUserStory = (id: string, storyId: string) => api.delete(`${url.GET_PROJECTS}/${id}/historias/${storyId}`);

export const updateSprintStatus = (id: string, sprintId: string, status: string) => api.put(`${url.GET_PROJECTS}/${id}/sprints/${sprintId}/status`, { status });
export const updateUserStoryStatus = (id: string, storyId: string, status: string) => api.put(`${url.GET_PROJECTS}/${id}/historias/${storyId}/status`, { status });
export const updateTechnicalTaskStatus = (id: string, taskId: string, status: string) => api.put(`${url.GET_PROJECTS}/${id}/tareas/${taskId}/status`, { status });

export const getUsersList = () => api.get("/usuarios");
export const resetUserPassword = (userId: string, data: any) => api.put(`/usuarios/${userId}/password`, data);
export const deleteUser = (userId: string) => api.delete(`/usuarios/${userId}`);

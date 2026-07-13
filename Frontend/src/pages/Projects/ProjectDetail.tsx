import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, CardBody, TabContent, TabPane, Button, Modal, ModalHeader, ModalBody, Form, FormGroup, Label, Input, Alert, Spinner, Badge, UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem, Progress } from 'reactstrap';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import { getProjectDetail, createUserStory, updateUserStory, deleteUserStory, createSprint, updateSprint, deleteSprint, assignStoryToSprint, removeStoryFromSprint, createTechnicalTask, startTechnicalTask, completeTechnicalTask, updateTechnicalTask, updateSprintStatus, updateUserStoryStatus, updateProject, deleteProject, getUsersList, addProjectMember, deleteProjectMember } from '../../helpers/fakebackend_helper';
import * as Yup from 'yup';
import { useFormik } from 'formik';
import React, { useState, useCallback, useEffect } from 'react';

import { StoriesTable } from './StoriesTable';
import { SprintsTable } from './SprintsTable';
import { KanbanTable } from './KanbanTable';
import ConfirmModal from '../../Components/Common/ConfirmModal';
import { toast } from 'react-toastify';

const ProjectDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setErrorState] = useState<string>("");
    const [kanbanViewMode, setKanbanViewMode] = useState<'board' | 'table'>('board');
    const [backlogViewMode, setBacklogViewMode] = useState<'cards' | 'table'>('cards');
    const [draggingStoryId, setDraggingStoryId] = useState<string | null>(null);
    
    const setError = (msg: string) => {
        setErrorState(msg);
        if (msg) {
            toast.error(msg, {
                position: "top-right",
                autoClose: 2000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
            });
            setTimeout(() => {
                setErrorState(prev => prev === msg ? "" : prev);
            }, 2000);
        }
    };
    const [activeTab, setActiveTab] = useState<string>('1');

    // Estado para edición del proyecto
    const [isEditingProj, setIsEditingProj] = useState<boolean>(false);
    const [projName, setProjName] = useState<string>("");
    const [projDesc, setProjDesc] = useState<string>("");

    useEffect(() => {
        if (project) {
            setProjName(project.nombre || "");
            setProjDesc(project.descripcion || "");
        }
    }, [project]);

    // Modales
    const [storyModal, setStoryModal] = useState<boolean>(false);
    const [editStoryModal, setEditStoryModal] = useState<boolean>(false);
    const [sprintModal, setSprintModal] = useState<boolean>(false);
    const [taskModal, setTaskModal] = useState<boolean>(false);
    const [assignModal, setAssignModal] = useState<boolean>(false);
    const [editTaskModal, setEditTaskModal] = useState<boolean>(false);
    const [deleteProjModal, setDeleteProjModal] = useState<boolean>(false);
    const [editingTask, setEditingTask] = useState<any>(null);
    const [editingStory, setEditingStory] = useState<any>(null);

    // States for generic delete confirmation popups
    const [confirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);
    const [confirmTitle, setConfirmTitle] = useState<string>("");
    const [confirmMessage, setConfirmMessage] = useState<string>("");
    const [confirmAction, setConfirmAction] = useState<() => void>(() => { });

    const [selectedStoryId, setSelectedStoryId] = useState<string>("");
    const [submitLoading, setSubmitLoading] = useState<boolean>(false);
    const [draggedOverSprintId, setDraggedOverSprintId] = useState<string>("");
    const [, setSuccessMessageState] = useState<string>("");
    const setSuccessMessage = (msg: string) => {
        setSuccessMessageState(msg);
        if (msg) {
            toast.success(msg, {
                position: "top-right",
                autoClose: 2000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
            });
            setTimeout(() => {
                setSuccessMessageState(prev => prev === msg ? "" : prev);
            }, 2000);
        }
    };
    const [expandedSprints, setExpandedSprints] = useState<Record<string, boolean>>({});
    const [draggedOverColumnStatus, setDraggedOverColumnStatus] = useState<string>("");
    const [showCompletedStories, setShowCompletedStories] = useState<boolean>(false);
    const [showClosedSprints, setShowClosedSprints] = useState<boolean>(false);
    const [kanbanSearchQuery, setKanbanSearchQuery] = useState<string>("");
    const [backlogSearchQuery, setBacklogSearchQuery] = useState<string>("");

    // Estado para renombrar sprint inline
    const [editingSprintId, setEditingSprintId] = useState<string | null>(null);
    const [editingSprintName, setEditingSprintName] = useState<string>("");


    // Estados para Gestión de Equipo
    const [systemUsers, setSystemUsers] = useState<any[]>([]);
    const [teamModal, setTeamModal] = useState<boolean>(false);
    const [selectedUserId, setSelectedUserId] = useState<string>("");
    const [selectedRole, setSelectedRole] = useState<string>("developer");
    const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
    const [projectRoles, setProjectRoles] = useState<string[]>(["owner", "developer", "scrum_master", "product_owner"]);

    useEffect(() => {
        if (id) {
            const stored = localStorage.getItem(`project_roles_${id}`);
            if (stored) {
                try {
                    setProjectRoles(JSON.parse(stored));
                } catch {
                    setProjectRoles(["owner", "developer", "scrum_master", "product_owner"]);
                }
            } else {
                setProjectRoles(["owner", "developer", "scrum_master", "product_owner"]);
            }
        }
    }, [id]);

    const handleAddRole = (roleName: string) => {
        const cleaned = roleName.trim().toLowerCase().replace(/\s+/g, '_');
        if (!cleaned) return;
        if (projectRoles.includes(cleaned)) {
            alert("El rol ya existe.");
            return;
        }
        const updated = [...projectRoles, cleaned];
        setProjectRoles(updated);
        localStorage.setItem(`project_roles_${id}`, JSON.stringify(updated));
    };

    const handleRemoveRole = (roleToRemove: string) => {
        if (["owner", "developer", "scrum_master", "product_owner"].includes(roleToRemove)) {
            alert("No se pueden eliminar los roles predeterminados del sistema.");
            return;
        }
        const updated = projectRoles.filter(r => r !== roleToRemove);
        setProjectRoles(updated);
        localStorage.setItem(`project_roles_${id}`, JSON.stringify(updated));
    };

    useEffect(() => {
        const rawAuth = sessionStorage.getItem("authUser");
        let user = null;
        if (rawAuth) {
            try {
                const parsed = JSON.parse(rawAuth);
                user = parsed.user || parsed.data || parsed;
            } catch (e) {
                console.error("Error parsing authUser", e);
            }
        }
        setCurrentUserProfile(user);

        const fetchUsers = async () => {
            try {
                const res: any = await getUsersList();
                setSystemUsers(res || []);
            } catch (e) {
                console.error("Error al obtener usuarios del sistema", e);
            }
        };
        fetchUsers();
    }, []);

    const toggleSprintExpand = (sprintId: string) => {
        setExpandedSprints(prev => ({
            ...prev,
            [sprintId]: !prev[sprintId]
        }));
    };

    const handleDragStart = (e: React.DragEvent, storyId: string) => {
        e.dataTransfer.setData("text/plain", storyId);
        setDraggingStoryId(storyId);
    };

    const handleDragEnd = () => {
        setDraggingStoryId(null);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = async (e: React.DragEvent, sprintId: string) => {
        e.preventDefault();
        setDraggedOverSprintId("");
        setDraggingStoryId(null);
        const storyId = e.dataTransfer.getData("text/plain");
        if (!id || !storyId || !sprintId) return;

        // Check if the story is already in any sprint
        const existingSprint = sprints.find((s: any) => s.backlog && s.backlog.includes(storyId));
        
        if (sprintId === 'backlog') {
            if (!existingSprint) return; // Already in backlog
            
            // --- OPTIMISTIC UPDATE ---
            const previousProject = { ...project };
            const updatedProject = JSON.parse(JSON.stringify(project));
            const oldSprint = updatedProject.sprints.find((s: any) => s.id === existingSprint.id);
            if (oldSprint && oldSprint.backlog) {
                oldSprint.backlog = oldSprint.backlog.filter((sid: string) => sid !== storyId);
            }
            setProject(updatedProject);
            setSuccessMessage("Historia devuelta al Backlog correctamente.");
            setTimeout(() => setSuccessMessage(""), 3000);

            try {
                await removeStoryFromSprint(id, existingSprint.id, storyId);
            } catch (err: any) {
                setProject(previousProject);
                setError(err.message || err || "Error al remover historia del sprint");
            }
            return;
        }

        if (existingSprint) {
            if (existingSprint.id === sprintId) {
                return; // Already in this sprint
            }

            // Move to another sprint
            // --- OPTIMISTIC UPDATE ---
            const previousProject = { ...project };
            const updatedProject = JSON.parse(JSON.stringify(project));
            
            // Remove from old sprint
            const oldSprint = updatedProject.sprints.find((s: any) => s.id === existingSprint.id);
            if (oldSprint && oldSprint.backlog) {
                oldSprint.backlog = oldSprint.backlog.filter((sid: string) => sid !== storyId);
            }
            // Add to new sprint
            const newSprint = updatedProject.sprints.find((s: any) => s.id === sprintId);
            if (newSprint) {
                if (!newSprint.backlog) newSprint.backlog = [];
                if (!newSprint.backlog.includes(storyId)) {
                    newSprint.backlog.push(storyId);
                }
            }
            
            setProject(updatedProject);
            setSuccessMessage("Historia movida de Sprint correctamente.");
            setTimeout(() => setSuccessMessage(""), 3000);

            try {
                await removeStoryFromSprint(id, existingSprint.id, storyId);
                await assignStoryToSprint(id, {
                    historia_id: storyId,
                    sprint_id: sprintId
                });
            } catch (err: any) {
                setProject(previousProject);
                setError(err.message || err || "Error al mover historia de sprint");
            }
            return;
        }

        // --- OPTIMISTIC UPDATE (Add from backlog to sprint) ---
        const previousProject = { ...project };
        const updatedProject = JSON.parse(JSON.stringify(project));
        const sprintToUpdate = updatedProject.sprints.find((s: any) => s.id === sprintId);
        if (sprintToUpdate) {
            if (!sprintToUpdate.backlog) sprintToUpdate.backlog = [];
            if (!sprintToUpdate.backlog.includes(storyId)) {
                sprintToUpdate.backlog.push(storyId);
            }
        }
        setProject(updatedProject);
        setSuccessMessage("Historia asignada al Sprint correctamente.");
        setTimeout(() => setSuccessMessage(""), 3000);

        try {
            await assignStoryToSprint(id, {
                historia_id: storyId,
                sprint_id: sprintId
            });
        } catch (err: any) {
            setProject(previousProject);
            setError(err.message || err || "Error al asignar historia");
        }
    };


    const handleSaveProjectDetails = async () => {
        if (!id || !projName.trim() || !projDesc.trim()) return;
        try {
            setSubmitLoading(true);
            await updateProject(id, {
                nombre: projName,
                descripcion: projDesc
            });
            setIsEditingProj(false);
            fetchProjectDetails();
            setSuccessMessage("Detalles del proyecto actualizados correctamente.");
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (err: any) {
            setError(err.message || err || "Error al actualizar los detalles del proyecto");
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleDeleteProject = async () => {
        if (!id) return;
        try {
            setSubmitLoading(true);
            await deleteProject(id);
            setDeleteProjModal(false);
            localStorage.removeItem("activeProjectId");
            localStorage.removeItem("activeProjectName");
            navigate('/projects');
        } catch (err: any) {
            setError(err.message || err || "Error al eliminar el proyecto");
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleManageMember = async () => {
        if (!id || !selectedUserId) return;
        try {
            setSubmitLoading(true);
            await addProjectMember(id, {
                usuario_id: selectedUserId,
                rol: selectedRole
            });
            setTeamModal(false);
            fetchProjectDetails();
            setSuccessMessage("Miembro del proyecto actualizado correctamente.");
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (err: any) {
            setError(err.message || err || "Error al actualizar el miembro");
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleDeleteMember = async (userId: string) => {
        if (!id || !userId) return;
        setConfirmTitle("¿Eliminar miembro?");
        setConfirmMessage("¿Estás seguro de que deseas eliminar a este miembro del proyecto?");
        setConfirmAction(() => async () => {
            try {
                setSubmitLoading(true);
                await deleteProjectMember(id, userId);
                fetchProjectDetails();
                setSuccessMessage("Miembro eliminado del proyecto correctamente.");
                setTimeout(() => setSuccessMessage(""), 3000);
            } catch (err: any) {
                setError(err.message || err || "Error al eliminar el miembro");
            } finally {
                setSubmitLoading(false);
                setConfirmModalOpen(false);
            }
        });
        setConfirmModalOpen(true);
    };

    const handleDeleteStory = async (storyId: string) => {
        if (!id || !storyId) return;
        setConfirmTitle("¿Eliminar historia de usuario?");
        setConfirmMessage("¿Estás seguro de que deseas eliminar esta historia de usuario? Esta acción también eliminará todas sus tareas técnicas.");
        setConfirmAction(() => async () => {
            try {
                setSubmitLoading(true);
                await deleteUserStory(id, storyId);
                fetchProjectDetails();
                setSuccessMessage("Historia de usuario eliminada correctamente.");
                setTimeout(() => setSuccessMessage(""), 3000);
            } catch (err: any) {
                setError(err.message || err || "Error al eliminar la historia de usuario");
            } finally {
                setSubmitLoading(false);
                setConfirmModalOpen(false);
            }
        });
        setConfirmModalOpen(true);
    };

    const handleDeleteSprint = async (sprintId: string) => {
        if (!id || !sprintId) return;
        setConfirmTitle("¿Eliminar sprint?");
        setConfirmMessage("¿Estás seguro de que deseas eliminar este sprint? Las historias asignadas volverán al backlog.");
        setConfirmAction(() => async () => {
            try {
                setSubmitLoading(true);
                await deleteSprint(id, sprintId);
                fetchProjectDetails();
                setSuccessMessage("Sprint eliminado correctamente.");
                setTimeout(() => setSuccessMessage(""), 3000);
            } catch (err: any) {
                setError(err.message || err || "Error al eliminar el sprint");
            } finally {
                setSubmitLoading(false);
                setConfirmModalOpen(false);
            }
        });
        setConfirmModalOpen(true);
    };

    const fetchProjectDetails = useCallback(async () => {
        if (!id) return;
        try {
            setLoading(true);
            const response: any = await getProjectDetail(id);
            setProject(response);
        } catch (err: any) {
            setError(err.message || err || "Error al obtener detalles del proyecto");
            localStorage.removeItem("activeProjectId");
            localStorage.removeItem("activeProjectName");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchProjectDetails();
    }, [id, fetchProjectDetails]);

    useEffect(() => {
        const handleProjectDataChanged = () => {
            fetchProjectDetails();
        };
        window.addEventListener("projectDataChanged", handleProjectDataChanged);
        return () => {
            window.removeEventListener("projectDataChanged", handleProjectDataChanged);
        };
    }, [fetchProjectDetails]);

    useEffect(() => {
        if (location.pathname.endsWith('/backlog')) {
            setActiveTab('1');
        } else if (location.pathname.endsWith('/kanban')) {
            setActiveTab('2');
        } else if (location.pathname.endsWith('/details')) {
            setActiveTab('3');
        } else if (location.pathname.endsWith('/team')) {
            setActiveTab('4');
        } else if (location.pathname.endsWith('/progress')) {
            setActiveTab('5');
        }
    }, [location.pathname]);

    useEffect(() => {
        if (project) {
            localStorage.setItem("activeProjectId", project.id);
            localStorage.setItem("activeProjectName", project.nombre);
        }
    }, [project]);

    // Formik: Historias de usuario
    const storyFormik = useFormik({
        initialValues: { titulo: '', story_points: 1, descripcion: '', asignado_a: [] as string[] },
        validationSchema: Yup.object({
            titulo: Yup.string().required("Título requerido"),
            story_points: Yup.number().min(1, "Debe ser al menos 1").required("Requerido"),
            asignado_a: Yup.array().of(Yup.string()).optional(),
        }),
        onSubmit: async (values, { resetForm }) => {
            if (!id) return;
            try {
                setSubmitLoading(true);
                const payload = {
                    ...values,
                    asignado_a: values.asignado_a && values.asignado_a.length > 0 ? values.asignado_a : null
                };
                const response: any = await createUserStory(id, payload);
                setProject(response);
                resetForm();
                setStoryModal(false);
                setSuccessMessage("Historia de usuario creada correctamente.");
                setTimeout(() => setSuccessMessage(""), 3000);
            } catch (err: any) {
                setError(err.message || err || "Error al crear historia");
            } finally {
                setSubmitLoading(false);
            }
        }
    });

    // Formik: Editar historia de usuario
    const editStoryFormik = useFormik({
        initialValues: {
            titulo: editingStory ? editingStory.titulo : '',
            story_points: editingStory ? editingStory.story_points : 1,
            descripcion: editingStory ? editingStory.descripcion || '' : '',
            asignado_a: editingStory ? (editingStory.asignados || (editingStory.asignado_a ? [editingStory.asignado_a] : [])) : [] as string[],
        },
        enableReinitialize: true,
        validationSchema: Yup.object({
            titulo: Yup.string().required("Título requerido"),
            story_points: Yup.number().min(1, "Debe ser al menos 1").required("Requerido"),
            asignado_a: Yup.array().of(Yup.string()).optional(),
        }),
        onSubmit: async (values) => {
            if (!id || !editingStory) return;
            try {
                setSubmitLoading(true);
                const payload = {
                    ...values,
                    asignado_a: values.asignado_a && values.asignado_a.length > 0 ? values.asignado_a : []
                };
                const response: any = await updateUserStory(id, editingStory.id, payload);
                setProject(response);
                setEditStoryModal(false);
                setEditingStory(null);
            } catch (err: any) {
                setError(err.message || err || "Error al actualizar historia");
            } finally {
                setSubmitLoading(false);
            }
        }
    });

    // Formik: Sprints
    const sprintFormik = useFormik({
        initialValues: { nombre: '', cantidad: 1, fecha_inicio: '', fecha_fin: '' },
        validationSchema: Yup.object({
            nombre: Yup.string().required("Nombre base del sprint requerido"),
            cantidad: Yup.number().min(1, "Mínimo 1 sprint").max(20, "Máximo 20 sprints").required(),
            fecha_inicio: Yup.string().nullable(),
            fecha_fin: Yup.string().nullable(),
        }),
        onSubmit: async (values, { resetForm }) => {
            if (!id) return;
            try {
                setSubmitLoading(true);
                const baseCount = (project?.sprints || []).length;
                const qty = Number(values.cantidad) || 1;
                if (qty === 1) {
                    await createSprint(id, {
                        nombre: values.nombre,
                        fecha_inicio: values.fecha_inicio ? new Date(values.fecha_inicio).toISOString() : null,
                        fecha_fin: values.fecha_fin ? new Date(values.fecha_fin).toISOString() : null,
                    });
                } else {
                    // Extract base name without trailing number for clean sequencing
                    const baseName = values.nombre.replace(/\s*\d+$/, '').trim() || values.nombre;
                    for (let i = 0; i < qty; i++) {
                        await createSprint(id, { nombre: `${baseName} ${baseCount + i + 1}` });
                    }
                }
                resetForm();
                setSprintModal(false);
                fetchProjectDetails();
            } catch (err: any) {
                setError(err.message || err || "Error al crear sprint");
            } finally {
                setSubmitLoading(false);
            }
        }
    });

    useEffect(() => {
        if (sprintModal && project) {
            const count = (project.sprints || []).length;
            const targetName = count > 0 ? `Sprint ${count + 1}` : "Sprint 1";
            if (sprintFormik.values.nombre !== targetName) {
                sprintFormik.setFieldValue('nombre', targetName);
            }
        }
    }, [sprintModal, project, sprintFormik]);

    // Formik: Tareas técnicas
    const taskFormik = useFormik({
        initialValues: { titulo: '', estimated_hours: 1, descripcion: '' },
        validationSchema: Yup.object({
            titulo: Yup.string().required("Título requerido"),
            estimated_hours: Yup.number().min(1, "Al menos 1 hora").required("Requerido"),
        }),
        onSubmit: async (values, { resetForm }) => {
            if (!id || !selectedStoryId) return;
            try {
                setSubmitLoading(true);
                const response: any = await createTechnicalTask(id, selectedStoryId, values);
                setProject(response);
                resetForm();
                setTaskModal(false);
            } catch (err: any) {
                setError(err.message || err || "Error al crear tarea");
            } finally {
                setSubmitLoading(false);
            }
        }
    });

    // Formik: Editar tarea técnica
    const editTaskFormik = useFormik({
        enableReinitialize: true,
        initialValues: {
            titulo: editingTask?.titulo || '',
            estimated_hours: editingTask?.estimated_hours || 1,
            descripcion: editingTask?.descripcion || '',
        },
        validationSchema: Yup.object({
            titulo: Yup.string().required("Título requerido"),
            estimated_hours: Yup.number().min(1, "Al menos 1 hora").required("Requerido"),
        }),
        onSubmit: async (values) => {
            if (!id || !editingTask) return;
            try {
                setSubmitLoading(true);
                const response: any = await updateTechnicalTask(id, editingTask.id, values);
                setProject(response);
                setEditTaskModal(false);
                setEditingTask(null);
            } catch (err: any) {
                setError(err.message || err || "Error al editar tarea");
            } finally {
                setSubmitLoading(false);
            }
        }
    });

    // Asignar historia a sprint
    const [targetSprintId, setTargetSprintId] = useState<string>("");
    const handleAssignStory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !selectedStoryId || !targetSprintId) return;

        // Check if the story is already in any sprint
        const existingSprint = sprints.find((s: any) => s.backlog && s.backlog.includes(selectedStoryId));
        if (existingSprint) {
            setError(`Esta historia ya está en el sprint "${existingSprint.nombre}".`);
            return;
        }

        try {
            setSubmitLoading(true);
            await assignStoryToSprint(id, {
                historia_id: selectedStoryId,
                sprint_id: targetSprintId
            });
            setAssignModal(false);
            fetchProjectDetails();
        } catch (err: any) {
            setError(err.message || err || "Error al asignar historia");
        } finally {
            setSubmitLoading(false);
        }
    };



    const handleStartTask = async (taskId: string) => {
        if (!id) return;
        try {
            const response: any = await startTechnicalTask(id, taskId);
            setProject(response);
        } catch (err: any) {
            setError(err.message || err || "Error al iniciar tarea");
        }
    };

    const handleCompleteTask = async (taskId: string) => {
        if (!id) return;
        try {
            const response: any = await completeTechnicalTask(id, taskId);
            setProject(response);
        } catch (err: any) {
            setError(err.message || err || "Error al completar tarea");
        }
    };

    const handleUpdateStoryStatus = async (storyId: string, status: string) => {
        if (!id) return;
        setDraggingStoryId(null);

        // --- OPTIMISTIC UPDATE ---
        const previousProject = { ...project };
        const updatedProject = JSON.parse(JSON.stringify(project));
        const storyToUpdate = updatedProject.historias.find((h: any) => h.id === storyId);
        if (storyToUpdate) {
            storyToUpdate.status = status;
        }
        // Also synchronize tasks status in frontend optimistically to match backend logic
        const targetTaskStatus = status === 'completed' ? 'done' : status;
        if (updatedProject.tareas) {
            updatedProject.tareas.forEach((t: any) => {
                if (t.historia_id === storyId) {
                    t.status = targetTaskStatus;
                }
            });
        }
        setProject(updatedProject);

        try {
            await updateUserStoryStatus(id, storyId, status);
        } catch (err: any) {
            setProject(previousProject);
            setError(err.message || err || "Error al actualizar el estado de la historia");
        }
    };

    const handleUpdateSprintStatus = async (sprintId: string, status: string) => {
        if (!id) return;

        // Si se intenta activar el sprint, verificar si ya hay otro activo
        if (status === 'active') {
            const alreadyActiveSprint = (project?.sprints || []).find((s: any) => s.status === 'active' && s.id !== sprintId);
            if (alreadyActiveSprint) {
                setError(`No se puede activar este sprint porque ya existe un sprint activo ("${alreadyActiveSprint.nombre}"). Cierra el sprint activo actual antes de activar otro.`);
                return;
            }
        }

        // --- OPTIMISTIC UPDATE ---
        const previousProject = { ...project };
        const updatedProject = JSON.parse(JSON.stringify(project));
        const sprintToUpdate = updatedProject.sprints.find((s: any) => s.id === sprintId);
        if (sprintToUpdate) {
            sprintToUpdate.status = status;
        }
        setProject(updatedProject);

        try {
            await updateSprintStatus(id, sprintId, status);
            if (status === 'active') {
                setSuccessMessage(`El sprint "${sprintToUpdate?.nombre}" ha sido activado correctamente.`);
                setTimeout(() => setSuccessMessage(""), 5000);
            } else if (status === 'closed') {
                setSuccessMessage(`El sprint "${sprintToUpdate?.nombre}" ha sido cerrado.`);
                setTimeout(() => setSuccessMessage(""), 5000);
            }
        } catch (err: any) {
            setProject(previousProject);
            setError(err.message || err || "Error al actualizar el estado del sprint");
        }
    };

    const handleRenameSprint = async (sprintId: string, nombre: string) => {
        if (!id || !nombre.trim()) return;
        const trimmed = nombre.trim();

        // Actualización optimista
        const previousProject = { ...project };
        const updatedProject = JSON.parse(JSON.stringify(project));
        const sprintToUpdate = updatedProject.sprints.find((s: any) => s.id === sprintId);
        if (sprintToUpdate) sprintToUpdate.nombre = trimmed;
        setProject(updatedProject);
        setEditingSprintId(null);
        setEditingSprintName("");

        try {
            await updateSprint(id, sprintId, { nombre: trimmed });
            setSuccessMessage(`Sprint renombrado a "${trimmed}".`);
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (err: any) {
            setProject(previousProject);
            setError(err.message || err || "Error al renombrar el sprint");
        }
    };



    const getStoryStatusClass = (status: string) => {
        switch (status) {
            case 'pending':
                return 'border-warning text-warning';
            case 'in_progress':
                return 'border-primary text-primary';
            case 'done':
            case 'completed':
                return 'border-success text-success';
            default:
                return 'border-secondary text-secondary';
        }
    };

    const getSprintStatusClass = (status: string) => {
        switch (status) {
            case 'planned':
                return 'border-warning text-warning';
            case 'active':
                return 'border-success text-success';
            case 'closed':
                return 'border-secondary text-secondary';
            default:
                return 'border-secondary text-secondary';
        }
    };

    const renderUserRoleBadges = (story: any) => {
        const asignados = story.asignados || (story.asignado_a ? [story.asignado_a] : []);
        if (!asignados.length || !project?.miembros) return null;
        return (
            <div className="d-flex flex-wrap gap-1 align-items-center">
                {asignados.map((asignadoId: string) => {
                    const role = project.miembros[asignadoId];
                    if (!role) return null;
                    const getRoleBadgeColor = (r: string) => {
                        switch (r) {
                            case 'owner': return 'warning';
                            case 'scrum_master': return 'primary';
                            case 'product_owner': return 'danger';
                            default: return 'info';
                        }
                    };
                    const userObj = systemUsers.find((u: any) => u.id === asignadoId);
                    const label = userObj ? userObj.name : role.replace('_', ' ');
                    return (
                        <Badge key={asignadoId} color={getRoleBadgeColor(role)} className="text-uppercase text-white" style={{ fontSize: '10px' }} title={userObj ? `${userObj.name} (${userObj.email})` : ""}>
                            {label}
                        </Badge>
                    );
                })}
            </div>
        );
    };

    if (loading && !project) {
        return (
            <div className="page-content d-flex flex-column justify-content-center align-items-center" style={{ minHeight: "80vh" }}>
                <Spinner color="primary" />
                <p className="mt-3 text-muted">Cargando detalles del proyecto Scrum...</p>
            </div>
        );
    }

    if (error && !project) {
        return (
            <div className="page-content">
                <Container fluid>
                    <Alert color="danger">{error}</Alert>
                    <Link to="/projects" className="btn btn-primary">Volver a Proyectos</Link>
                </Container>
            </div>
        );
    }

    // Extraer datos del modelo
    const historias = project ? (project.historias || []) : [];
    const sprints = project ? (project.sprints || []) : [];
    const tareas = project ? (project.tareas || []) : [];
    const activeSprint: any = sprints.find((s: any) => s.status === 'active');



    // Filtrado de historias para el backlog con búsqueda
    const filteredBacklogStories = historias.filter((h: any) => {
        const originalIndex = historias.findIndex((x: any) => x.id === h.id);
        const huId = `hu-${originalIndex + 1}`;
        const query = backlogSearchQuery.toLowerCase();

        // Verificar si la historia está asignada a algún sprint
        const isAssignedToSprint = sprints.some((s: any) => s.backlog?.includes(h.id));

        // Si no hay búsqueda, no mostrar si ya está asignada a un sprint
        if (!backlogSearchQuery && isAssignedToSprint) {
            return false;
        }

        const matchSearch = !backlogSearchQuery || h.titulo.toLowerCase().includes(query) || huId.includes(query);
        return matchSearch;
    });

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title={project?.nombre || "Detalle"} pageTitle="Proyecto" link={`/projects/${id}/backlog`} />



                    <TabContent activeTab={activeTab}>
                        {/* Tab 1: Backlog con Historias y Sprints */}
                        <TabPane tabId="1">
                            <div className="mb-3 d-flex justify-content-between align-items-center">
                                <div>
                                    <Button
                                        color={backlogViewMode === 'cards' ? 'primary' : 'light'}
                                        size="sm"
                                        className="me-2 rounded-2"
                                        onClick={() => setBacklogViewMode('cards')}
                                    >
                                        <i className="ri-layout-grid-line align-middle me-1"></i> Vista Clásica
                                    </Button>
                                    <Button
                                        color={backlogViewMode === 'table' ? 'primary' : 'light'}
                                        size="sm"
                                        className="rounded-2"
                                        onClick={() => setBacklogViewMode('table')}
                                    >
                                        <i className="ri-table-line align-middle me-1"></i> Vista de Tabla
                                    </Button>
                                </div>
                                <div className="position-relative" style={{ maxWidth: '300px', width: '100%' }}>
                                    <Input
                                        type="text"
                                        placeholder="Buscar por título o HU-..."
                                        value={backlogSearchQuery}
                                        onChange={(e) => setBacklogSearchQuery(e.target.value)}
                                        className="form-control pe-5"
                                        style={{ borderRadius: '20px' }}
                                    />
                                    <i className="ri-search-line position-absolute top-50 translate-middle-y text-muted" style={{ right: '15px' }}></i>
                                </div>
                            </div>

                            {backlogViewMode === 'cards' ? (
                                <Row>
                                    <Col lg={8}>
                                        {/* Sección: Historias de Usuario (Clásica) */}
                                        <Card 
                                            className={`border transition-all ${draggedOverSprintId === 'backlog' ? 'border-primary bg-primary bg-opacity-10 shadow' : 'border-light-subtle shadow-none'}`}
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, 'backlog')}
                                            onDragEnter={() => setDraggedOverSprintId('backlog')}
                                            onDragLeave={() => setDraggedOverSprintId("")}
                                        >
                                            <CardBody>
                                                <div className="d-flex align-items-center justify-content-between mb-3">
                                                    <h5 className="card-title mb-0">Historias de Usuario</h5>
                                                    <Button color="success" size="sm" onClick={() => setStoryModal(true)}>
                                                        <i className="ri-add-line align-bottom me-1"></i> Crear Historia
                                                    </Button>
                                                </div>

                                                {filteredBacklogStories.filter((h: any) => h.status !== 'done' && h.status !== 'completed').length === 0 ? (
                                                    <div className="text-center py-4">
                                                        <p className="text-muted">No hay historias de usuario activas en el backlog.</p>
                                                    </div>
                                                ) : (
                                                    <div className="d-flex flex-column gap-2">
                                                        {filteredBacklogStories
                                                            .filter((h: any) => h.status !== 'done' && h.status !== 'completed')
                                                            .map((story: any) => {
                                                                const originalIndex = historias.findIndex((h: any) => h.id === story.id);
                                                                return (
                                                                    <Card
                                                                        className="border border-light-subtle shadow-none mb-0 cursor-grab transition-all"
                                                                        key={story.id}
                                                                        draggable="true"
                                                                        onDragStart={(e) => handleDragStart(e, story.id)}
                                                                        onDragEnd={handleDragEnd}
                                                                        style={{
                                                                            opacity: draggingStoryId === story.id ? 0.2 : 1,
                                                                            borderStyle: draggingStoryId === story.id ? 'dashed' : 'solid',
                                                                            borderWidth: draggingStoryId === story.id ? '2px' : '1px',
                                                                            borderColor: draggingStoryId === story.id ? 'var(--vz-primary)' : undefined
                                                                        }}
                                                                    >
                                                                        <CardBody className="p-3">
                                                                            <div className="d-flex align-items-center justify-content-between">
                                                                                <div className="d-flex align-items-center gap-2">
                                                                                    <Badge color="info" className="px-2">{story.story_points} Puntos</Badge>
                                                                                    {renderUserRoleBadges(story)}
                                                                                    <h5 className="fs-14 mb-0 text-truncate" style={{ maxWidth: '280px' }}>
                                                                                        <Link to={`/projects/${id}/stories/${story.id}`} className="text-body text-decoration-none">
                                                                                            <span className="text-muted me-1">HU-{originalIndex + 1}:</span>
                                                                                            <strong>{story.titulo}</strong>
                                                                                        </Link>
                                                                                    </h5>
                                                                                </div>
                                                                                <div className="d-flex align-items-center gap-2">
                                                                                    <Badge
                                                                                        color={
                                                                                            story.status === 'completed' || story.status === 'done' ? 'success' :
                                                                                                story.status === 'in_progress' ? 'warning' : 'secondary'
                                                                                        }
                                                                                        className="text-uppercase"
                                                                                    >
                                                                                        {story.status === 'completed' || story.status === 'done' ? 'Completada' :
                                                                                            story.status === 'in_progress' ? 'En Progreso' : 'Pendiente'}
                                                                                    </Badge>

                                                                                    <UncontrolledDropdown>
                                                                                        <DropdownToggle tag="button" className="btn btn-link text-muted p-1">
                                                                                            <i className="ri-more-2-fill fs-16"></i>
                                                                                        </DropdownToggle>
                                                                                        <DropdownMenu strategy="fixed" className="dropdown-menu-end">
                                                                                            <DropdownItem tag={Link} to={`/projects/${id}/stories/${story.id}`}>
                                                                                                <i className="ri-eye-line align-bottom me-2 text-muted"></i> Ver Detalle
                                                                                            </DropdownItem>
                                                                                            <DropdownItem onClick={() => {
                                                                                                setEditingStory(story);
                                                                                                setEditStoryModal(true);
                                                                                            }}>
                                                                                                <i className="ri-pencil-line align-bottom me-2 text-muted"></i> Editar
                                                                                            </DropdownItem>
                                                                                            <DropdownItem onClick={() => {
                                                                                                setSelectedStoryId(story.id);
                                                                                                setAssignModal(true);
                                                                                            }}>
                                                                                                <i className="ri-send-plane-line align-bottom me-2 text-muted"></i> Asignar a Sprint
                                                                                            </DropdownItem>
                                                                                            <DropdownItem divider />
                                                                                            <DropdownItem className="text-danger" onClick={() => handleDeleteStory(story.id)}>
                                                                                                <i className="ri-delete-bin-5-line align-bottom me-2 text-danger"></i> Eliminar
                                                                                            </DropdownItem>
                                                                                        </DropdownMenu>
                                                                                    </UncontrolledDropdown>
                                                                                </div>
                                                                            </div>
                                                                        </CardBody>
                                                                    </Card>
                                                                );
                                                            })}
                                                    </div>
                                                )}

                                                {filteredBacklogStories.filter((h: any) => h.status === 'done' || h.status === 'completed').length > 0 && (
                                                    <>
                                                        <div className="mt-3 text-center">
                                                            <Button
                                                                color="link"
                                                                className="text-muted text-decoration-none fs-13"
                                                                onClick={() => setShowCompletedStories(!showCompletedStories)}
                                                            >
                                                                <i className={`ri-eye${(showCompletedStories || backlogSearchQuery) ? '-off' : ''}-line align-middle me-1`}></i>
                                                                {showCompletedStories ? "Ocultar Historias Completadas" : <>Mostrar Historias Completadas <span className="badge bg-secondary ms-1">{filteredBacklogStories.filter((h: any) => h.status === 'done' || h.status === 'completed').length}</span></>}
                                                            </Button>
                                                        </div>
                                                        {(showCompletedStories || backlogSearchQuery) && (
                                                            <div className="d-flex flex-column gap-2 mt-2 opacity-75">
                                                                {filteredBacklogStories
                                                                    .filter((h: any) => h.status === 'done' || h.status === 'completed')
                                                                    .map((story: any) => {
                                                                        const originalIndex = historias.findIndex((h: any) => h.id === story.id);
                                                                        return (
                                                                            <Card className="border border-success-subtle shadow-none mb-0 bg-success-subtle bg-opacity-10" key={story.id}>
                                                                                <CardBody className="p-3">
                                                                                    <div className="d-flex align-items-center justify-content-between">
                                                                                        <div className="d-flex align-items-center gap-2">
                                                                                            <Badge color="success" className="px-2">Completada</Badge>
                                                                                            <h5 className="fs-14 mb-0 text-truncate text-decoration-line-through text-muted" style={{ maxWidth: '280px' }}>
                                                                                                <Link to={`/projects/${id}/stories/${story.id}`} className="text-muted text-decoration-none">
                                                                                                    <span className="text-muted me-1">HU-{originalIndex + 1}:</span>
                                                                                                    <strong>{story.titulo}</strong>
                                                                                                </Link>
                                                                                            </h5>
                                                                                        </div>
                                                                                        <div className="d-flex align-items-center gap-2">
                                                                                            <Badge
                                                                                                color={
                                                                                                    story.status === 'completed' || story.status === 'done' ? 'success' :
                                                                                                        story.status === 'in_progress' ? 'warning' : 'secondary'
                                                                                                }
                                                                                                className="text-uppercase"
                                                                                             >
                                                                                                {story.status === 'completed' || story.status === 'done' ? 'Completada' :
                                                                                                    story.status === 'in_progress' ? 'En Progreso' : 'Pendiente'}
                                                                                             </Badge>
                                                                                            <UncontrolledDropdown>
                                                                                                <DropdownToggle tag="button" className="btn btn-link text-muted p-1">
                                                                                                    <i className="ri-more-2-fill fs-16"></i>
                                                                                                </DropdownToggle>
                                                                                                <DropdownMenu strategy="fixed" className="dropdown-menu-end">
                                                                                                    <DropdownItem tag={Link} to={`/projects/${id}/stories/${story.id}`}>
                                                                                                        <i className="ri-eye-line align-bottom me-2 text-muted"></i> Ver Detalle
                                                                                                    </DropdownItem>
                                                                                                    <DropdownItem onClick={() => {
                                                                                                        setEditingStory(story);
                                                                                                        setEditStoryModal(true);
                                                                                                    }}>
                                                                                                        <i className="ri-pencil-line align-bottom me-2 text-muted"></i> Editar
                                                                                                    </DropdownItem>
                                                                                                    <DropdownItem divider />
                                                                                                    <DropdownItem className="text-danger" onClick={() => handleDeleteStory(story.id)}>
                                                                                                        <i className="ri-delete-bin-5-line align-bottom me-2 text-danger"></i> Eliminar
                                                                                                    </DropdownItem>
                                                                                                </DropdownMenu>
                                                                                            </UncontrolledDropdown>
                                                                                        </div>
                                                                                    </div>
                                                                                </CardBody>
                                                                            </Card>
                                                                        );
                                                                    })}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </CardBody>
                                        </Card>
                                    </Col>

                                    <Col lg={4}>
                                        {/* Sección: Sprints (Clásica) */}
                                        <Card className="border shadow-none">
                                            <CardBody>
                                                <div className="d-flex align-items-center justify-content-between mb-4">
                                                    <h5 className="card-title mb-0">Sprints</h5>
                                                    <Button color="success" onClick={() => setSprintModal(true)}>
                                                        <i className="ri-add-line align-bottom me-1"></i> Planear Sprint
                                                    </Button>
                                                </div>

                                                {sprints.filter((s: any) => s.status !== 'closed').length === 0 ? (
                                                    <div className="text-center py-4">
                                                        <p className="text-muted">No se han planeado sprints aún.</p>
                                                    </div>
                                                ) : (
                                                    <div className="d-flex flex-column gap-2">
                                                        {sprints
                                                            .filter((s: any) => s.status !== 'closed')
                                                            .map((sprint: any) => {
                                                                const isDraggedOver = draggedOverSprintId === sprint.id;
                                                                const isExpanded = !!expandedSprints[sprint.id];
                                                                const sprintStories = historias.filter((h: any) => sprint.backlog?.includes(h.id));
                                                                return (
                                                                    <Card
                                                                        className={`border mb-0 cursor-pointer ${isDraggedOver ? 'border-primary bg-primary bg-opacity-10 shadow' : 'border-light-subtle shadow-none'}`}
                                                                        key={sprint.id}
                                                                        onDragOver={handleDragOver}
                                                                        onDrop={(e) => handleDrop(e, sprint.id)}
                                                                        onDragEnter={() => setDraggedOverSprintId(sprint.id)}
                                                                        onDragLeave={() => setDraggedOverSprintId("")}
                                                                        onClick={() => toggleSprintExpand(sprint.id)}
                                                                        style={{ transition: 'all 0.2s ease', borderWidth: isDraggedOver ? '2px' : '1px' }}
                                                                    >
                                                                        <CardBody className="p-3">
                                                                            <div className="d-flex align-items-center justify-content-between">
                                                                                <h6 className="fs-14 mb-0">
                                                                                    <span
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            toggleSprintExpand(sprint.id);
                                                                                        }}
                                                                                        className="cursor-pointer"
                                                                                    >
                                                                                        <i className={`ri-arrow-${isExpanded ? 'up' : 'down'}-s-line fs-16 align-middle me-1 text-muted`}></i>
                                                                                    </span>
                                                                                    <Link
                                                                                        to={`/projects/${id}/sprints/${sprint.id}`}
                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                        className="text-body"
                                                                                    >
                                                                                        <strong>{sprint.nombre}</strong>
                                                                                    </Link>
                                                                                </h6>
                                                                                <div className="d-flex align-items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                                                    <Input
                                                                                        type="select"
                                                                                        bsSize="sm"
                                                                                        className={`form-select-sm ${getSprintStatusClass(sprint.status)}`}
                                                                                        style={{ width: '110px', height: '28px', padding: '0.1rem 0.5rem', fontSize: '12px' }}
                                                                                        value={sprint.status}
                                                                                        onChange={(e) => handleUpdateSprintStatus(sprint.id, e.target.value)}
                                                                                    >
                                                                                        <option value="planned">Planificado</option>
                                                                                        <option value="active">Activo</option>
                                                                                        <option value="closed">Cerrado</option>
                                                                                    </Input>
                                                                                    <Badge color="success" className="text-white px-2">{sprint.backlog?.length || 0} Historias</Badge>
                                                                                    <UncontrolledDropdown>
                                                                                        <DropdownToggle tag="button" className="btn btn-link text-muted p-1">
                                                                                            <i className="ri-more-2-fill fs-16"></i>
                                                                                        </DropdownToggle>
                                                                                        <DropdownMenu strategy="fixed" className="dropdown-menu-end">
                                                                                            <DropdownItem tag={Link} to={`/projects/${id}/sprints/${sprint.id}`}>
                                                                                                <i className="ri-eye-line align-bottom me-2 text-muted"></i> Ver Detalle
                                                                                            </DropdownItem>
                                                                                            <DropdownItem divider />
                                                                                            <DropdownItem
                                                                                                className="text-danger"
                                                                                                onClick={() => handleDeleteSprint(sprint.id)}
                                                                                            >
                                                                                                <i className="ri-delete-bin-line align-bottom me-2"></i> Eliminar Sprint
                                                                                            </DropdownItem>
                                                                                        </DropdownMenu>
                                                                                    </UncontrolledDropdown>
                                                                                </div>
                                                                            </div>

                                                                            {isExpanded && (
                                                                                <div className="mt-3 border-top pt-2" onClick={(e) => e.stopPropagation()}>
                                                                                    <h6 className="fs-11 text-muted text-uppercase mb-2">Historias Asignadas:</h6>
                                                                                    {sprintStories.length === 0 ? (
                                                                                        <p className="text-muted fs-12 fst-italic mb-0">No hay historias en este sprint.</p>
                                                                                    ) : (
                                                                                        <div className="d-flex flex-column gap-1">
                                                                                            {sprintStories.map((story: any) => {
                                                                                                const sIndex = historias.findIndex((h: any) => h.id === story.id);
                                                                                                return (
                                                                                                    <div
                                                                                                        key={story.id}
                                                                                                        className="d-flex align-items-center justify-content-between p-1 bg-light rounded border border-light-subtle cursor-grab transition-all"
                                                                                                        draggable="true"
                                                                                                        onDragStart={(e) => handleDragStart(e, story.id)}
                                                                                                        onDragEnd={handleDragEnd}
                                                                                                        style={{
                                                                                                            opacity: draggingStoryId === story.id ? 0.3 : 1,
                                                                                                            borderStyle: draggingStoryId === story.id ? 'dashed' : 'solid',
                                                                                                            borderColor: draggingStoryId === story.id ? 'var(--vz-primary)' : undefined
                                                                                                        }}
                                                                                                    >
                                                                                                        <Link to={`/projects/${id}/stories/${story.id}`} className="fs-12 text-truncate text-body text-decoration-none" style={{ maxWidth: '75%' }}>
                                                                                                            <span className="text-muted me-1">HU-{sIndex + 1}:</span>
                                                                                                            <strong>{story.titulo}</strong>
                                                                                                        </Link>
                                                                                                        <div className="d-flex align-items-center gap-1">
                                                                                                            <Badge color="info" style={{ fontSize: '10px' }}>{story.story_points} Puntos</Badge>
                                                                                                            {renderUserRoleBadges(story)}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                );
                                                                                            })}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </CardBody>
                                                                    </Card>
                                                                );
                                                            })}
                                                    </div>
                                                )}

                                                {sprints.filter((s: any) => s.status === 'closed').length > 0 && (
                                                    <>
                                                        <div className="mt-3 text-center">
                                                            <Button
                                                                color="link"
                                                                className="text-muted text-decoration-none fs-13"
                                                                onClick={() => setShowClosedSprints(!showClosedSprints)}
                                                            >
                                                                <i className={`ri-eye${showClosedSprints ? '-off' : ''}-line align-middle me-1`}></i>
                                                                {showClosedSprints ? "Ocultar Sprints Cerrados" : `Mostrar Sprints Cerrados (${sprints.filter((s: any) => s.status === 'closed').length})`}
                                                            </Button>
                                                        </div>
                                                        {showClosedSprints && (
                                                            <div className="d-flex flex-column gap-2 mt-2 opacity-75">
                                                                {sprints
                                                                    .filter((s: any) => s.status === 'closed')
                                                                    .map((sprint: any) => {
                                                                        const isExpanded = !!expandedSprints[sprint.id];
                                                                        const sprintStories = historias.filter((h: any) => sprint.backlog?.includes(h.id));
                                                                        return (
                                                                            <Card
                                                                                className="border border-light-subtle shadow-none mb-0 cursor-pointer bg-light"
                                                                                key={sprint.id}
                                                                                onClick={() => toggleSprintExpand(sprint.id)}
                                                                            >
                                                                                <CardBody className="p-3">
                                                                                    <div className="d-flex align-items-center justify-content-between">
                                                                                        <h6 className="fs-14 mb-0 text-muted">
                                                                                            <span
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    toggleSprintExpand(sprint.id);
                                                                                                }}
                                                                                                className="cursor-pointer"
                                                                                            >
                                                                                                <i className={`ri-arrow-${isExpanded ? 'up' : 'down'}-s-line fs-16 align-middle me-1 text-muted`}></i>
                                                                                            </span>
                                                                                            <span className="text-decoration-line-through"><strong>{sprint.nombre}</strong></span>
                                                                                        </h6>
                                                                                        <div className="d-flex align-items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                                                            <Input
                                                                                                type="select"
                                                                                                bsSize="sm"
                                                                                                className={`form-select-sm ${getSprintStatusClass(sprint.status)}`}
                                                                                                style={{ width: '110px', height: '28px', padding: '0.1rem 0.5rem', fontSize: '12px' }}
                                                                                                value={sprint.status}
                                                                                                onChange={(e) => handleUpdateSprintStatus(sprint.id, e.target.value)}
                                                                                            >
                                                                                                <option value="planned">Planificado</option>
                                                                                                <option value="active">Activo</option>
                                                                                                <option value="closed">Cerrado</option>
                                                                                            </Input>
                                                                                            <Badge color="secondary" className="text-white px-2">{sprint.backlog?.length || 0} H</Badge>
                                                                                            <UncontrolledDropdown>
                                                                                                <DropdownToggle tag="button" className="btn btn-link text-muted p-1">
                                                                                                    <i className="ri-more-2-fill fs-16"></i>
                                                                                                </DropdownToggle>
                                                                                                <DropdownMenu strategy="fixed" className="dropdown-menu-end">
                                                                                                    <DropdownItem tag={Link} to={`/projects/${id}/sprints/${sprint.id}`}>
                                                                                                        <i className="ri-eye-line align-bottom me-2 text-muted"></i> Ver Detalle
                                                                                                    </DropdownItem>
                                                                                                    <DropdownItem divider />
                                                                                                    <DropdownItem
                                                                                                        className="text-danger"
                                                                                                        onClick={() => handleDeleteSprint(sprint.id)}
                                                                                                    >
                                                                                                        <i className="ri-delete-bin-line align-bottom me-2"></i> Eliminar Sprint
                                                                                                    </DropdownItem>
                                                                                                </DropdownMenu>
                                                                                            </UncontrolledDropdown>
                                                                                        </div>
                                                                                    </div>
                                                                                    {isExpanded && (
                                                                                        <div className="mt-3 border-top pt-2" onClick={(e) => e.stopPropagation()}>
                                                                                            <h6 className="fs-11 text-muted text-uppercase mb-2">Historias del Sprint Cerrado:</h6>
                                                                                            {sprintStories.length === 0 ? (
                                                                                                <p className="text-muted fs-12 fst-italic mb-0">No había historias en este sprint.</p>
                                                                                            ) : (
                                                                                                <div className="d-flex flex-column gap-1">
                                                                                                    {sprintStories.map((story: any) => {
                                                                                                        const sIndex = historias.findIndex((h: any) => h.id === story.id);
                                                                                                        return (
                                                                                                            <div key={story.id} className="d-flex align-items-center justify-content-between p-1 bg-light rounded border border-light-subtle">
                                                                                                                <span className="fs-12 text-truncate text-muted" style={{ maxWidth: '75%' }}>
                                                                                                                    <span className="text-muted me-1">HU-{sIndex + 1}:</span>
                                                                                                                    {story.titulo}
                                                                                                                </span>
                                                                                                                <div className="d-flex align-items-center gap-1">
                                                                                                                    <Badge color="light" className="text-muted border" style={{ fontSize: '10px' }}>{story.story_points} Puntos</Badge>
                                                                                                                    {renderUserRoleBadges(story)}
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        );
                                                                                                    })}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </CardBody>
                                                                            </Card>
                                                                        );
                                                                    })}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </CardBody>
                                        </Card>
                                    </Col>
                                </Row>
                            ) : (
                                <Row>
                                    <Col lg={8}>
                                        {/* Sección: Historias de Usuario (TanStack) */}
                                        <Card className="border shadow-none">
                                            <CardBody>
                                                <div className="d-flex align-items-center justify-content-between mb-3">
                                                    <h5 className="card-title mb-0">Historias de Usuario</h5>
                                                    <Button color="success" size="sm" onClick={() => setStoryModal(true)}>
                                                        <i className="ri-add-line align-bottom me-1"></i> Crear Historia
                                                    </Button>
                                                </div>

                                                {filteredBacklogStories.length === 0 ? (
                                                    <div className="text-center py-4">
                                                        <p className="text-muted">No hay historias de usuario en el backlog.</p>
                                                    </div>
                                                ) : (
                                                    <StoriesTable
                                                        data={filteredBacklogStories}
                                                        allStories={historias}
                                                        projectId={id || ""}
                                                        projectMiembros={project?.miembros}
                                                        onUpdateStatus={handleUpdateStoryStatus}
                                                        onEdit={(story) => {
                                                            setEditingStory(story);
                                                            setEditStoryModal(true);
                                                        }}
                                                        onAssign={(storyId) => {
                                                            setSelectedStoryId(storyId);
                                                            setAssignModal(true);
                                                        }}
                                                        onDelete={handleDeleteStory}
                                                        getStoryStatusClass={getStoryStatusClass}
                                                        handleDragStart={handleDragStart}
                                                        draggingStoryId={draggingStoryId}
                                                        handleDragEnd={handleDragEnd}
                                                    />
                                                )}
                                            </CardBody>
                                        </Card>
                                    </Col>

                                    <Col lg={4}>
                                        {/* Sección: Sprints (TanStack) */}
                                        <Card className="border shadow-none">
                                            <CardBody>
                                                <div className="d-flex align-items-center justify-content-between mb-4">
                                                    <h5 className="card-title mb-0">Sprints</h5>
                                                    <Button color="success" size="sm" onClick={() => setSprintModal(true)}>
                                                        <i className="ri-add-line align-bottom me-1"></i> Planear Sprint
                                                    </Button>
                                                </div>

                                                {sprints.length === 0 ? (
                                                    <div className="text-center py-4">
                                                        <p className="text-muted">No se han planeado sprints aún.</p>
                                                    </div>
                                                ) : (
                                                    <SprintsTable
                                                        data={sprints}
                                                        historias={historias}
                                                        projectId={id || ""}
                                                        onUpdateStatus={handleUpdateSprintStatus}
                                                        onDeleteStory={handleDeleteStory}
                                                        onDeleteSprint={handleDeleteSprint}
                                                        onRenameSprint={handleRenameSprint}
                                                        getSprintStatusClass={getSprintStatusClass}
                                                        draggedOverSprintId={draggedOverSprintId}
                                                        setDraggedOverSprintId={setDraggedOverSprintId}
                                                        handleDragOver={handleDragOver}
                                                        handleDrop={handleDrop}
                                                    />
                                                )}
                                            </CardBody>
                                        </Card>
                                    </Col>
                                </Row>
                            )}
                        </TabPane>

                        {/* Tab 2: Kanban Board */}
                        <TabPane tabId="2">
                            <div className="mb-3 d-flex justify-content-between align-items-center">
                                <div>
                                    <Button
                                        color={kanbanViewMode === 'board' ? 'primary' : 'light'}
                                        size="sm"
                                        className="me-2 rounded-2"
                                        onClick={() => setKanbanViewMode('board')}
                                    >
                                        <i className="ri-kanban-view align-middle me-1"></i> Tablero
                                    </Button>
                                    <Button
                                        color={kanbanViewMode === 'table' ? 'primary' : 'light'}
                                        size="sm"
                                        className="rounded-2"
                                        onClick={() => setKanbanViewMode('table')}
                                    >
                                        <i className="ri-table-line align-middle me-1"></i> Vista de Tabla
                                    </Button>
                                </div>
                                <div className="position-relative" style={{ maxWidth: '300px', width: '100%' }}>
                                    <Input
                                        type="text"
                                        placeholder="Buscar por título o HU-..."
                                        value={kanbanSearchQuery}
                                        onChange={(e) => setKanbanSearchQuery(e.target.value)}
                                        className="form-control pe-5"
                                        style={{ borderRadius: '20px' }}
                                    />
                                    <i className="ri-search-line position-absolute top-50 translate-middle-y text-muted" style={{ right: '15px' }}></i>
                                </div>
                            </div>

                            {kanbanViewMode === 'board' ? (
                                <Row>
                                    {/* Column 1: Planificado */}
                                    <Card className="d-none"></Card>
                                    <Col lg={4}>
                                        <Card
                                            className={`transition-all bg-light-subtle ${draggedOverColumnStatus === 'pending' ? 'border-primary bg-primary bg-opacity-10 shadow-lg' : ''}`}
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                setDraggedOverColumnStatus("");
                                                const storyId = e.dataTransfer.getData("text/plain");
                                                if (storyId) handleUpdateStoryStatus(storyId, 'pending');
                                            }}
                                            onDragEnter={() => setDraggedOverColumnStatus('pending')}
                                            onDragLeave={() => setDraggedOverColumnStatus("")}
                                            style={{ transition: 'all 0.2s ease', minHeight: '450px', borderWidth: draggedOverColumnStatus === 'pending' ? '2px' : '1px' }}
                                        >
                                            <CardBody>
                                                <h6 className="card-title text-muted text-uppercase mb-3">Planificado</h6>
                                                {historias
                                                    .filter((h: any) => {
                                                        const matchStatus = h.status === 'pending';
                                                        const originalIndex = historias.findIndex((x: any) => x.id === h.id);
                                                        const huId = `hu-${originalIndex + 1}`;
                                                        const query = kanbanSearchQuery.toLowerCase();
                                                        const matchSearch = !kanbanSearchQuery || h.titulo.toLowerCase().includes(query) || huId.includes(query);
                                                        return matchStatus && matchSearch;
                                                    })
                                                    .map((story: any) => {
                                                        const sIndex = historias.findIndex((x: any) => x.id === story.id);
                                                        return (
                                                            <Card
                                                                className="mb-2 shadow-sm border border-light-subtle hover-shadow transition-all bg-light-subtle"
                                                                key={story.id}
                                                                draggable="true"
                                                                onDragStart={(e) => handleDragStart(e, story.id)}
                                                                onDragEnd={handleDragEnd}
                                                                style={{
                                                                    opacity: draggingStoryId === story.id ? 0.2 : 1,
                                                                    borderStyle: draggingStoryId === story.id ? 'dashed' : 'solid',
                                                                    borderWidth: draggingStoryId === story.id ? '2px' : '1px',
                                                                    borderColor: draggingStoryId === story.id ? 'var(--vz-primary)' : undefined,
                                                                    transition: 'opacity 0.1s ease'
                                                                }}
                                                            >
                                                                <CardBody className="p-3">
                                                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                                                        <Badge color="info" className="px-2">{story.story_points} SP</Badge>
                                                                        <span className="text-muted fs-11 fw-medium">HU-{sIndex + 1}</span>
                                                                    </div>
                                                                    <h6 className="fs-14 mb-0">
                                                                        <Link to={`/projects/${id}/stories/${story.id}`} className="text-body fw-bold hover-text-primary text-decoration-none">
                                                                            {story.titulo}
                                                                        </Link>
                                                                    </h6>
                                                                </CardBody>
                                                            </Card>
                                                        );
                                                    })}
                                            </CardBody>
                                        </Card>
                                    </Col>

                                    {/* Column 2: En Progreso */}
                                    <Col lg={4}>
                                        <Card
                                            className={`transition-all bg-light-subtle ${draggedOverColumnStatus === 'in_progress' ? 'border-primary bg-primary bg-opacity-10 shadow-lg' : ''}`}
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                setDraggedOverColumnStatus("");
                                                const storyId = e.dataTransfer.getData("text/plain");
                                                if (storyId) handleUpdateStoryStatus(storyId, 'in_progress');
                                            }}
                                            onDragEnter={() => setDraggedOverColumnStatus('in_progress')}
                                            onDragLeave={() => setDraggedOverColumnStatus("")}
                                            style={{ transition: 'all 0.2s ease', minHeight: '450px', borderWidth: draggedOverColumnStatus === 'in_progress' ? '2px' : '1px' }}
                                        >
                                            <CardBody>
                                                <h6 className="card-title text-muted text-uppercase mb-3">En Progreso</h6>
                                                {historias
                                                    .filter((h: any) => {
                                                        const matchStatus = h.status === 'in_progress';
                                                        const originalIndex = historias.findIndex((x: any) => x.id === h.id);
                                                        const huId = `hu-${originalIndex + 1}`;
                                                        const query = kanbanSearchQuery.toLowerCase();
                                                        const matchSearch = !kanbanSearchQuery || h.titulo.toLowerCase().includes(query) || huId.includes(query);
                                                        return matchStatus && matchSearch;
                                                    })
                                                    .map((story: any) => {
                                                        const sIndex = historias.findIndex((x: any) => x.id === story.id);
                                                        return (
                                                            <Card
                                                                className="mb-2 shadow-sm border border-light-subtle hover-shadow transition-all bg-light-subtle"
                                                                key={story.id}
                                                                draggable="true"
                                                                onDragStart={(e) => handleDragStart(e, story.id)}
                                                                onDragEnd={handleDragEnd}
                                                                style={{
                                                                    opacity: draggingStoryId === story.id ? 0.2 : 1,
                                                                    borderStyle: draggingStoryId === story.id ? 'dashed' : 'solid',
                                                                    borderWidth: draggingStoryId === story.id ? '2px' : '1px',
                                                                    borderColor: draggingStoryId === story.id ? 'var(--vz-primary)' : undefined,
                                                                    transition: 'opacity 0.1s ease'
                                                                }}
                                                            >
                                                                <CardBody className="p-3">
                                                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                                                        <Badge color="info" className="px-2">{story.story_points} SP</Badge>
                                                                        <span className="text-muted fs-11 fw-medium">HU-{sIndex + 1}</span>
                                                                    </div>
                                                                    <h6 className="fs-14 mb-0">
                                                                        <Link to={`/projects/${id}/stories/${story.id}`} className="text-body fw-bold hover-text-primary text-decoration-none">
                                                                            {story.titulo}
                                                                        </Link>
                                                                    </h6>
                                                                </CardBody>
                                                            </Card>
                                                        );
                                                    })}
                                            </CardBody>
                                        </Card>
                                    </Col>

                                    {/* Column 3: Completadas */}
                                    <Col lg={4}>
                                        <Card
                                            className={`transition-all bg-light-subtle ${draggedOverColumnStatus === 'done' ? 'border-primary bg-primary bg-opacity-10 shadow-lg' : ''}`}
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                setDraggedOverColumnStatus("");
                                                const storyId = e.dataTransfer.getData("text/plain");
                                                if (storyId) handleUpdateStoryStatus(storyId, 'done');
                                            }}
                                            onDragEnter={() => setDraggedOverColumnStatus('done')}
                                            onDragLeave={() => setDraggedOverColumnStatus("")}
                                            style={{ transition: 'all 0.2s ease', minHeight: '450px', borderWidth: draggedOverColumnStatus === 'done' ? '2px' : '1px' }}
                                        >
                                            <CardBody>
                                                <h6 className="card-title text-muted text-uppercase mb-3">Completadas</h6>
                                                {historias
                                                    .filter((h: any) => {
                                                        const matchStatus = h.status === 'done' || h.status === 'completed';
                                                        const originalIndex = historias.findIndex((x: any) => x.id === h.id);
                                                        const huId = `hu-${originalIndex + 1}`;
                                                        const query = kanbanSearchQuery.toLowerCase();
                                                        const matchSearch = !kanbanSearchQuery || h.titulo.toLowerCase().includes(query) || huId.includes(query);
                                                        return matchStatus && matchSearch;
                                                    })
                                                    .map((story: any) => {
                                                        const sIndex = historias.findIndex((x: any) => x.id === story.id);
                                                        return (
                                                            <Card
                                                                className="mb-2 shadow-sm border border-success-subtle hover-shadow transition-all bg-success-subtle bg-opacity-10"
                                                                key={story.id}
                                                                draggable="true"
                                                                onDragStart={(e) => handleDragStart(e, story.id)}
                                                                onDragEnd={handleDragEnd}
                                                                style={{
                                                                    opacity: draggingStoryId === story.id ? 0.2 : 1,
                                                                    borderStyle: draggingStoryId === story.id ? 'dashed' : 'solid',
                                                                    borderWidth: draggingStoryId === story.id ? '2px' : '1px',
                                                                    borderColor: draggingStoryId === story.id ? 'var(--vz-primary)' : undefined,
                                                                    transition: 'opacity 0.1s ease'
                                                                }}
                                                            >
                                                                <CardBody className="p-3">
                                                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                                                        <Badge color="success" className="px-2">Completada</Badge>
                                                                        <span className="text-muted fs-11 fw-medium">HU-{sIndex + 1}</span>
                                                                    </div>
                                                                    <h6 className="fs-14 mb-0 text-muted text-decoration-line-through">
                                                                        <Link to={`/projects/${id}/stories/${story.id}`} className="text-muted fw-bold hover-text-primary text-decoration-none">
                                                                            {story.titulo}
                                                                        </Link>
                                                                    </h6>
                                                                </CardBody>
                                                            </Card>
                                                        );
                                                    })}
                                            </CardBody>
                                        </Card>
                                    </Col>
                                </Row>
                            ) : (
                                <Card className="border shadow-none">
                                    <CardBody>
                                        <KanbanTable
                                            data={activeSprint ? historias.filter((h: any) => activeSprint.backlog?.includes(h.id)) : historias}
                                            allStories={historias}
                                            tasks={tareas}
                                            projectId={id || ""}
                                            onUpdateStoryStatus={handleUpdateStoryStatus}
                                            onStartTask={handleStartTask}
                                            onCompleteTask={handleCompleteTask}
                                            onEditTask={(task) => {
                                                setEditingTask(task);
                                                setEditTaskModal(true);
                                            }}
                                            onAddTask={(storyId) => {
                                                setSelectedStoryId(storyId);
                                                setTaskModal(true);
                                            }}
                                            getStoryStatusClass={getStoryStatusClass}
                                        />
                                    </CardBody>
                                </Card>
                            )}
                        </TabPane>

                        {/* Tab 3: Detalles del Proyecto */}
                        <TabPane tabId="3">
                            <Card className="border border-light-subtle shadow-none">
                                <CardBody className="p-4">
                                    <div className="d-flex align-items-center justify-content-between mb-4">
                                        <h5 className="card-title mb-0">Información del Proyecto</h5>
                                        {!isEditingProj && (
                                            <div className="d-flex gap-2">
                                                <Button color="primary" size="sm" onClick={() => setIsEditingProj(true)}>
                                                    <i className="ri-pencil-line align-bottom me-1"></i> Editar Detalles
                                                </Button>
                                                {(currentUserProfile?.role === 'admin' || project?.miembros?.[currentUserProfile?.id] === 'owner') && (
                                                    <Button color="danger" size="sm" onClick={() => setDeleteProjModal(true)}>
                                                        <i className="ri-delete-bin-line align-bottom me-1"></i> Eliminar Proyecto
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {isEditingProj ? (
                                        <div className="d-flex flex-column gap-3">
                                            <FormGroup className="mb-0">
                                                <Label for="projName" className="fw-semibold">Nombre del Proyecto</Label>
                                                <Input
                                                    id="projName"
                                                    type="text"
                                                    value={projName}
                                                    onChange={(e) => setProjName(e.target.value)}
                                                    placeholder="Nombre del proyecto"
                                                    className="form-control"
                                                />
                                            </FormGroup>
                                            <FormGroup className="mb-0">
                                                <Label for="projDesc" className="fw-semibold">Descripción del Proyecto</Label>
                                                <Input
                                                    id="projDesc"
                                                    type="textarea"
                                                    rows="8"
                                                    value={projDesc}
                                                    onChange={(e) => setProjDesc(e.target.value)}
                                                    placeholder="Descripción del proyecto..."
                                                    className="form-control"
                                                    style={{ resize: 'vertical' }}
                                                />
                                            </FormGroup>
                                            <div className="d-flex gap-2 mt-2">
                                                <Button color="success" onClick={handleSaveProjectDetails} disabled={submitLoading || !projName.trim() || !projDesc.trim()}>
                                                    {submitLoading ? <Spinner size="sm" className="me-1" /> : null}
                                                    Guardar Cambios
                                                </Button>
                                                <Button color="light" onClick={() => {
                                                    setIsEditingProj(false);
                                                    setProjName(project.nombre || "");
                                                    setProjDesc(project.descripcion || "");
                                                }} disabled={submitLoading}>
                                                    Cancelar
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="d-flex flex-column gap-4">
                                            <div>
                                                <h6 className="text-muted text-uppercase fs-12 fw-semibold mb-2">Nombre</h6>
                                                <p className="fs-15 fw-medium text-secondary mb-0">{project?.nombre}</p>
                                            </div>
                                            <div>
                                                <h6 className="text-muted text-uppercase fs-12 fw-semibold mb-2">Descripción</h6>
                                                <div className="p-3 bg-light rounded" style={{ minHeight: '150px', whiteSpace: 'pre-wrap' }}>
                                                    {project?.descripcion || <span className="text-muted fst-italic">Sin descripción registrada.</span>}
                                                </div>
                                            </div>
                                            <div>
                                                <h6 className="text-muted text-uppercase fs-12 fw-semibold mb-2">ID del Proyecto</h6>
                                                <p className="text-muted font-monospace mb-0">{project?.id}</p>
                                            </div>
                                            <hr className="my-3 border-light-subtle" />
                                            <div>
                                                <h6 className="text-muted text-uppercase fs-12 fw-semibold mb-3">Roles del Proyecto</h6>
                                                <div className="d-flex flex-wrap gap-2 mb-3">
                                                    {projectRoles.map((role) => {
                                                        const isDefault = ["owner", "developer", "scrum_master", "product_owner"].includes(role);
                                                        return (
                                                            <Badge
                                                                key={role}
                                                                color={isDefault ? "light" : "primary"}
                                                                className="text-uppercase py-2 px-3 d-flex align-items-center gap-2 border"
                                                                style={{ fontSize: "11px" }}
                                                            >
                                                                {role === 'owner' ? 'Owner / Creador' : role.replace(/_/g, ' ')}
                                                                {!isDefault && (currentUserProfile?.role === 'admin' || project?.miembros?.[currentUserProfile?.id] === 'owner') && (
                                                                    <i
                                                                        className="ri-close-line cursor-pointer fs-14 text-danger ms-1"
                                                                        style={{ cursor: "pointer" }}
                                                                        onClick={() => handleRemoveRole(role)}
                                                                    ></i>
                                                                )}
                                                            </Badge>
                                                        );
                                                    })}
                                                </div>

                                                {(currentUserProfile?.role === 'admin' || project?.miembros?.[currentUserProfile?.id] === 'owner') && (
                                                    <div className="d-flex gap-2" style={{ maxWidth: "320px" }}>
                                                        <Input
                                                            id="newRoleName"
                                                            type="text"
                                                            placeholder="Nuevo nombre de rol (ej: QA)"
                                                            bsSize="sm"
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    const val = (e.target as HTMLInputElement).value;
                                                                    if (val) {
                                                                        handleAddRole(val);
                                                                        (e.target as HTMLInputElement).value = "";
                                                                    }
                                                                }
                                                            }}
                                                        />
                                                        <Button
                                                            color="success"
                                                            size="sm"
                                                            onClick={() => {
                                                                const el = document.getElementById("newRoleName") as HTMLInputElement;
                                                                if (el && el.value) {
                                                                    handleAddRole(el.value);
                                                                    el.value = "";
                                                                }
                                                            }}
                                                        >
                                                            Agregar
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        </TabPane>

                        {/* Tab 4: Gestión de Equipo */}
                        <TabPane tabId="4">
                            <Card className="border border-light-subtle shadow-none">
                                <CardBody className="p-4">
                                    <div className="d-flex align-items-center justify-content-between mb-4">
                                        <div>
                                            <h5 className="card-title mb-1">Miembros del Proyecto</h5>
                                            <p className="text-muted mb-0 fs-12">Lista de usuarios asignados y sus respectivos roles dentro de este proyecto.</p>
                                        </div>
                                        {(currentUserProfile?.role === 'admin' || project?.miembros?.[currentUserProfile?.id] === 'owner') && (
                                            <Button
                                                color="success"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedUserId("");
                                                    setSelectedRole("developer");
                                                    setTeamModal(true);
                                                }}
                                            >
                                                <i className="ri-user-add-line align-bottom me-1"></i> Agregar Miembros
                                            </Button>
                                        )}
                                    </div>

                                    <div className="table-responsive table-card">
                                        <table className="table table-striped table-nowrap align-middle mb-0">
                                            <thead className="table-light text-muted">
                                                <tr>
                                                    <th scope="col">Nombre</th>
                                                    <th scope="col">Correo Electrónico</th>
                                                    <th scope="col">Rol Global</th>
                                                    <th scope="col">Rol en Proyecto</th>
                                                    {(currentUserProfile?.role === 'admin' || project?.miembros?.[currentUserProfile?.id] === 'owner') && (
                                                        <th scope="col" style={{ width: '120px' }}>Acción</th>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {project && Object.entries(project.miembros || {}).map(([uId, pRole]: any) => {
                                                    const userDetail = systemUsers.find((u: any) => u.id === uId);
                                                    const getRoleBadgeColor = (role: string) => {
                                                        switch (role) {
                                                            case 'owner': return 'warning';
                                                            case 'scrum_master': return 'primary';
                                                            case 'product_owner': return 'danger';
                                                            default: return 'info';
                                                        }
                                                    };
                                                    return (
                                                        <tr key={uId}>
                                                            <td className="fw-medium">
                                                                {userDetail ? userDetail.name : <span className="text-muted fst-italic">Usuario desconocido</span>}
                                                            </td>
                                                            <td>{userDetail ? userDetail.email : uId}</td>
                                                            <td>
                                                                <Badge color="light" className="text-muted text-uppercase border">
                                                                    {userDetail ? userDetail.role : 'DEVELOPER'}
                                                                </Badge>
                                                            </td>
                                                            <td>
                                                                <Badge color={getRoleBadgeColor(pRole)} className="text-uppercase">
                                                                    {pRole === 'owner' ? 'Owner / Creador' : pRole.replace('_', ' ')}
                                                                </Badge>
                                                            </td>
                                                            {(currentUserProfile?.role === 'admin' || project?.miembros?.[currentUserProfile?.id] === 'owner') && (
                                                                <td>
                                                                    <div className="d-flex gap-2">
                                                                        <Button
                                                                            color="soft-primary"
                                                                            size="sm"
                                                                            onClick={() => {
                                                                                setSelectedUserId(uId);
                                                                                setSelectedRole(pRole);
                                                                                setTeamModal(true);
                                                                            }}
                                                                        >
                                                                            <i className="ri-pencil-fill"></i> Editar
                                                                        </Button>
                                                                        {pRole !== 'owner' && (
                                                                            <Button
                                                                                color="soft-danger"
                                                                                size="sm"
                                                                                onClick={() => handleDeleteMember(uId)}
                                                                            >
                                                                                <i className="ri-delete-bin-line"></i> Eliminar
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    );
                                                })}
                                                {(!project || Object.keys(project.miembros || {}).length === 0) && (
                                                    <tr>
                                                        <td colSpan={5} className="text-center py-4 text-muted">
                                                            No hay miembros asignados a este proyecto.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardBody>
                            </Card>
                        </TabPane>

                        {/* Tab 5: Progreso y Métricas */}
                        <TabPane tabId="5">
                            <Card className="border border-light-subtle shadow-none">
                                <CardBody className="p-4">
                                    <h5 className="card-title mb-4">Progreso del Proyecto y Sprints</h5>

                                    <Row className="mb-4">
                                        <Col lg={4}>
                                            <Card className="bg-light shadow-none border mb-3 mb-lg-0">
                                                <CardBody className="p-3 text-center">
                                                    <div className="avatar-sm mx-auto mb-3">
                                                        <span className="avatar-title bg-info-subtle text-info rounded-circle fs-20" style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                                                            <i className="ri-list-check-2"></i>
                                                        </span>
                                                    </div>
                                                    <h5 className="mb-1">{historias.filter((h: any) => h.status === 'done' || h.status === 'completed').length} / {historias.length}</h5>
                                                    <p className="text-muted mb-3">Historias Completadas</p>
                                                    <Progress
                                                        value={historias.length > 0 ? Math.round((historias.filter((h: any) => h.status === 'done' || h.status === 'completed').length / historias.length) * 100) : 0}
                                                        color="info"
                                                        className="progress-sm"
                                                    />
                                                    <div className="mt-2 text-end">
                                                        <span className="badge bg-info-subtle text-info fs-11">
                                                            {historias.length > 0 ? Math.round((historias.filter((h: any) => h.status === 'done' || h.status === 'completed').length / historias.length) * 100) : 0}%
                                                        </span>
                                                    </div>
                                                </CardBody>
                                            </Card>
                                        </Col>
                                        <Col lg={4}>
                                            <Card className="bg-light shadow-none border mb-3 mb-lg-0">
                                                <CardBody className="p-3 text-center">
                                                    <div className="avatar-sm mx-auto mb-3">
                                                        <span className="avatar-title bg-primary-subtle text-primary rounded-circle fs-20" style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                                                            <i className="ri-vip-diamond-line"></i>
                                                        </span>
                                                    </div>
                                                    <h5 className="mb-1">
                                                        {historias.filter((h: any) => h.status === 'done' || h.status === 'completed').reduce((acc: number, h: any) => acc + (h.story_points || 0), 0)} / {historias.reduce((acc: number, h: any) => acc + (h.story_points || 0), 0)}
                                                    </h5>
                                                    <p className="text-muted mb-3">Puntos Logrados</p>
                                                    <Progress
                                                        value={historias.reduce((acc: number, h: any) => acc + (h.story_points || 0), 0) > 0 ? Math.round((historias.filter((h: any) => h.status === 'done' || h.status === 'completed').reduce((acc: number, h: any) => acc + (h.story_points || 0), 0) / historias.reduce((acc: number, h: any) => acc + (h.story_points || 0), 0)) * 100) : 0}
                                                        color="primary"
                                                        className="progress-sm"
                                                    />
                                                    <div className="mt-2 text-end">
                                                        <span className="badge bg-primary-subtle text-primary fs-11">
                                                            {historias.reduce((acc: number, h: any) => acc + (h.story_points || 0), 0) > 0 ? Math.round((historias.filter((h: any) => h.status === 'done' || h.status === 'completed').reduce((acc: number, h: any) => acc + (h.story_points || 0), 0) / historias.reduce((acc: number, h: any) => acc + (h.story_points || 0), 0)) * 100) : 0}%
                                                        </span>
                                                    </div>
                                                </CardBody>
                                            </Card>
                                        </Col>
                                        <Col lg={4}>
                                            <Card className="bg-light shadow-none border mb-0">
                                                <CardBody className="p-3 text-center">
                                                    <div className="avatar-sm mx-auto mb-3">
                                                        <span className="avatar-title bg-success-subtle text-success rounded-circle fs-20" style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                                                            <i className="ri-checkbox-circle-line"></i>
                                                        </span>
                                                    </div>
                                                    <h5 className="mb-1">{tareas.filter((t: any) => t.status === 'done' || t.status === 'completed').length} / {tareas.length}</h5>
                                                    <p className="text-muted mb-3">Tareas Técnicas Finalizadas</p>
                                                    <Progress
                                                        value={tareas.length > 0 ? Math.round((tareas.filter((t: any) => t.status === 'done' || t.status === 'completed').length / tareas.length) * 100) : 0}
                                                        color="success"
                                                        className="progress-sm"
                                                    />
                                                    <div className="mt-2 text-end">
                                                        <span className="badge bg-success-subtle text-success fs-11">
                                                            {tareas.length > 0 ? Math.round((tareas.filter((t: any) => t.status === 'done' || t.status === 'completed').length / tareas.length) * 100) : 0}%
                                                        </span>
                                                    </div>
                                                </CardBody>
                                            </Card>
                                        </Col>
                                    </Row>

                                    <h5 className="card-title mt-4 mb-3">Progreso de Sprints</h5>
                                    {sprints.length === 0 ? (
                                        <div className="text-center py-4 bg-light rounded">
                                            <p className="text-muted mb-0">No hay sprints registrados para este proyecto.</p>
                                        </div>
                                    ) : (
                                        <Row>
                                            {sprints.map((sprint: any) => {
                                                const sprintStories = historias.filter((h: any) => sprint.backlog?.includes(h.id));
                                                const totalSprintSP = sprintStories.reduce((acc: number, h: any) => acc + (h.story_points || 0), 0);
                                                const completedSprintSP = sprintStories.filter((h: any) => h.status === 'done' || h.status === 'completed').reduce((acc: number, h: any) => acc + (h.story_points || 0), 0);
                                                const sprintSPPercentage = totalSprintSP > 0 ? Math.round((completedSprintSP / totalSprintSP) * 100) : 0;

                                                const totalSprintStories = sprintStories.length;
                                                const completedSprintStories = sprintStories.filter((h: any) => h.status === 'done' || h.status === 'completed').length;
                                                const sprintStoriesPercentage = totalSprintStories > 0 ? Math.round((completedSprintStories / totalSprintStories) * 100) : 0;

                                                return (
                                                    <Col md={6} key={sprint.id} className="mb-3">
                                                        <Card className="border shadow-none mb-0">
                                                            <CardBody className="p-3">
                                                                <div className="d-flex align-items-center justify-content-between mb-3">
                                                                    <h6 className="fs-14 fw-semibold mb-0">{sprint.nombre}</h6>
                                                                    <Badge
                                                                        color={
                                                                            sprint.status === 'active' ? 'success' :
                                                                                sprint.status === 'closed' ? 'secondary' : 'warning'
                                                                        }
                                                                        className="text-uppercase"
                                                                    >
                                                                        {
                                                                            sprint.status === 'active' ? 'Activo' :
                                                                                sprint.status === 'closed' ? 'Cerrado' : 'Planificado'
                                                                        }
                                                                    </Badge>
                                                                </div>

                                                                <div className="mb-3">
                                                                    <div className="d-flex justify-content-between fs-12 text-muted mb-1">
                                                                        <span>Puntos ({completedSprintSP} / {totalSprintSP} Puntos)</span>
                                                                        <span className="fw-semibold text-body">{sprintSPPercentage}%</span>
                                                                    </div>
                                                                    <Progress value={sprintSPPercentage} color="primary" className="progress-sm" style={{ height: '6px' }} />
                                                                </div>

                                                                <div>
                                                                    <div className="d-flex justify-content-between fs-12 text-muted mb-1">
                                                                        <span>Historias de Usuario ({completedSprintStories} / {totalSprintStories} HU)</span>
                                                                        <span className="fw-semibold text-body">{sprintStoriesPercentage}%</span>
                                                                    </div>
                                                                    <Progress value={sprintStoriesPercentage} color="info" className="progress-sm" style={{ height: '6px' }} />
                                                                </div>
                                                            </CardBody>
                                                        </Card>
                                                    </Col>
                                                );
                                            })}
                                        </Row>
                                    )}
                                </CardBody>
                            </Card>
                        </TabPane>
                    </TabContent>

                    {/* Modal: Gestionar Miembro de Proyecto */}
                    <Modal isOpen={teamModal} toggle={() => setTeamModal(false)} centered>
                        <ModalHeader toggle={() => setTeamModal(false)}>Gestionar Miembro de Proyecto</ModalHeader>
                        <ModalBody>
                            <Form onSubmit={(e) => { e.preventDefault(); handleManageMember(); }}>
                                <FormGroup className="mb-3">
                                    <Label for="selectUser" className="fw-semibold">Usuario</Label>
                                    <Input
                                        type="select"
                                        id="selectUser"
                                        value={selectedUserId}
                                        onChange={(e) => setSelectedUserId(e.target.value)}
                                        required
                                    >
                                        <option value="">Selecciona un usuario...</option>
                                        {systemUsers.map((user: any) => (
                                            <option key={user.id} value={user.id}>
                                                {user.name} ({user.email})
                                            </option>
                                        ))}
                                    </Input>
                                </FormGroup>
                                <FormGroup className="mb-3">
                                    <Label for="selectRole" className="fw-semibold">Rol del Proyecto</Label>
                                    <Input
                                        type="select"
                                        id="selectRole"
                                        value={selectedRole}
                                        onChange={(e) => setSelectedRole(e.target.value)}
                                        required
                                    >
                                        {projectRoles.map((role) => (
                                            <option key={role} value={role}>
                                                {role === 'owner' ? 'Owner / Creador' : role.replace(/_/g, ' ').toUpperCase()}
                                            </option>
                                        ))}
                                    </Input>
                                </FormGroup>
                                <div className="d-flex justify-content-end gap-2">
                                    <Button color="light" type="button" onClick={() => setTeamModal(false)} disabled={submitLoading}>
                                        Cancelar
                                    </Button>
                                    <Button color="success" type="submit" disabled={submitLoading || !selectedUserId}>
                                        {submitLoading ? <Spinner size="sm" className="me-1" /> : null}
                                        Guardar
                                    </Button>
                                </div>
                            </Form>
                        </ModalBody>
                    </Modal>

                    {/* Modal: Crear Historia */}
                    <Modal isOpen={storyModal} toggle={() => setStoryModal(false)} centered>
                        <ModalHeader toggle={() => setStoryModal(false)}>Nueva Historia de Usuario</ModalHeader>
                        <ModalBody>
                            <Form onSubmit={storyFormik.handleSubmit}>
                                <FormGroup className="mb-3">
                                    <Label for="titulo">Título de la Historia</Label>
                                    <Input id="titulo" name="titulo" type="text" onChange={storyFormik.handleChange} onBlur={storyFormik.handleBlur} value={storyFormik.values.titulo} invalid={storyFormik.touched.titulo && !!storyFormik.errors.titulo} />
                                </FormGroup>
                                <FormGroup className="mb-3">
                                    <Label for="story_points">Puntos (Fibonacci)</Label>
                                    <Input
                                        id="story_points"
                                        name="story_points"
                                        type="select"
                                        onChange={storyFormik.handleChange}
                                        onBlur={storyFormik.handleBlur}
                                        value={storyFormik.values.story_points}
                                    >
                                        <option value={1}>1 Punto</option>
                                        <option value={2}>2 Puntos</option>
                                        <option value={3}>3 Puntos</option>
                                        <option value={5}>5 Puntos</option>
                                        <option value={8}>8 Puntos</option>
                                        <option value={13}>13 Puntos</option>
                                        <option value={21}>21 Puntos</option>
                                    </Input>
                                </FormGroup>
                                <FormGroup className="mb-3">
                                    <Label>Asignar a (Múltiple, Opcional)</Label>
                                    <div className="border rounded p-2" style={{ maxHeight: '150px', overflowY: 'auto', background: 'var(--vz-input-bg)' }}>
                                        {project && Object.entries(project.miembros || {}).length === 0 ? (
                                            <p className="text-muted fs-12 mb-0">No hay miembros disponibles en el proyecto.</p>
                                        ) : (
                                            project && Object.entries(project.miembros || {}).map(([uId, pRole]: any) => {
                                                const userDetail = systemUsers.find((u: any) => u.id === uId);
                                                const nameLabel = userDetail ? `${userDetail.name} (${pRole.replace(/_/g, ' ').toUpperCase()})` : uId;
                                                const isChecked = Array.isArray(storyFormik.values.asignado_a) && storyFormik.values.asignado_a.includes(uId);
                                                return (
                                                    <div key={uId} className="form-check mb-1">
                                                        <input
                                                            type="checkbox"
                                                            className="form-check-input"
                                                            id={`create-assign-user-${uId}`}
                                                            checked={isChecked}
                                                            onChange={(e) => {
                                                                let currentValues = [...storyFormik.values.asignado_a];
                                                                if (e.target.checked) {
                                                                    if (!currentValues.includes(uId)) currentValues.push(uId);
                                                                } else {
                                                                    currentValues = currentValues.filter((id: string) => id !== uId);
                                                                }
                                                                storyFormik.setFieldValue('asignado_a', currentValues);
                                                            }}
                                                        />
                                                        <label className="form-check-label fs-12" htmlFor={`create-assign-user-${uId}`}>
                                                            {nameLabel}
                                                        </label>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </FormGroup>
                                <FormGroup className="mb-3">
                                    <Label for="descripcion">Descripción</Label>
                                    <Input id="descripcion" name="descripcion" type="textarea" onChange={storyFormik.handleChange} onBlur={storyFormik.handleBlur} value={storyFormik.values.descripcion} />
                                </FormGroup>
                                <div className="d-flex justify-content-end gap-2">
                                    <Button type="button" color="secondary" onClick={() => setStoryModal(false)}>Cancelar</Button>
                                    <Button color="success" type="submit" disabled={submitLoading}>
                                        {submitLoading ? <Spinner size="sm" /> : "Guardar Historia"}
                                    </Button>
                                </div>
                            </Form>
                        </ModalBody>
                    </Modal>

                    {/* Modal: Editar Historia */}
                    <Modal isOpen={editStoryModal} toggle={() => { setEditStoryModal(false); setEditingStory(null); }} centered>
                        <ModalHeader toggle={() => { setEditStoryModal(false); setEditingStory(null); }}>Editar Historia de Usuario</ModalHeader>
                        <ModalBody>
                            <Form onSubmit={editStoryFormik.handleSubmit}>
                                <FormGroup className="mb-3">
                                    <Label for="edit-titulo">Título de la Historia</Label>
                                    <Input id="edit-titulo" name="titulo" type="text" onChange={editStoryFormik.handleChange} onBlur={editStoryFormik.handleBlur} value={editStoryFormik.values.titulo} invalid={editStoryFormik.touched.titulo && !!editStoryFormik.errors.titulo} />
                                </FormGroup>
                                <FormGroup className="mb-3">
                                    <Label for="edit-story_points">Puntos (Fibonacci)</Label>
                                    <Input
                                        id="edit-story_points"
                                        name="story_points"
                                        type="select"
                                        onChange={editStoryFormik.handleChange}
                                        onBlur={editStoryFormik.handleBlur}
                                        value={editStoryFormik.values.story_points}
                                    >
                                        <option value={1}>1 Punto</option>
                                        <option value={2}>2 Puntos</option>
                                        <option value={3}>3 Puntos</option>
                                        <option value={5}>5 Puntos</option>
                                        <option value={8}>8 Puntos</option>
                                        <option value={13}>13 Puntos</option>
                                        <option value={21}>21 Puntos</option>
                                    </Input>
                                </FormGroup>
                                <FormGroup className="mb-3">
                                    <Label>Asignar a (Múltiple, Opcional)</Label>
                                    <div className="border rounded p-2" style={{ maxHeight: '150px', overflowY: 'auto', background: 'var(--vz-input-bg)' }}>
                                        {project && Object.entries(project.miembros || {}).length === 0 ? (
                                            <p className="text-muted fs-12 mb-0">No hay miembros disponibles en el proyecto.</p>
                                        ) : (
                                            project && Object.entries(project.miembros || {}).map(([uId, pRole]: any) => {
                                                const userDetail = systemUsers.find((u: any) => u.id === uId);
                                                const nameLabel = userDetail ? `${userDetail.name} (${pRole.replace(/_/g, ' ').toUpperCase()})` : uId;
                                                const isChecked = Array.isArray(editStoryFormik.values.asignado_a) && editStoryFormik.values.asignado_a.includes(uId);
                                                return (
                                                    <div key={uId} className="form-check mb-1">
                                                        <input
                                                            type="checkbox"
                                                            className="form-check-input"
                                                            id={`edit-assign-user-${uId}`}
                                                            checked={isChecked}
                                                            onChange={(e) => {
                                                                let currentValues = [...editStoryFormik.values.asignado_a];
                                                                if (e.target.checked) {
                                                                    if (!currentValues.includes(uId)) currentValues.push(uId);
                                                                } else {
                                                                    currentValues = currentValues.filter((id: string) => id !== uId);
                                                                }
                                                                editStoryFormik.setFieldValue('asignado_a', currentValues);
                                                            }}
                                                        />
                                                        <label className="form-check-label fs-12" htmlFor={`edit-assign-user-${uId}`}>
                                                            {nameLabel}
                                                        </label>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </FormGroup>
                                <FormGroup className="mb-3">
                                    <Label for="edit-descripcion">Descripción</Label>
                                    <Input id="edit-descripcion" name="descripcion" type="textarea" onChange={editStoryFormik.handleChange} onBlur={editStoryFormik.handleBlur} value={editStoryFormik.values.descripcion} />
                                </FormGroup>
                                <div className="d-flex justify-content-end gap-2">
                                    <Button type="button" color="secondary" onClick={() => { setEditStoryModal(false); setEditingStory(null); }}>Cancelar</Button>
                                    <Button color="success" type="submit" disabled={submitLoading}>
                                        {submitLoading ? <Spinner size="sm" /> : "Guardar Cambios"}
                                    </Button>
                                </div>
                            </Form>
                        </ModalBody>
                    </Modal>

                    {/* Modal: Crear Sprint */}
                    <Modal isOpen={sprintModal} toggle={() => setSprintModal(false)} centered>
                        <ModalHeader toggle={() => setSprintModal(false)}>Planear Sprint(s)</ModalHeader>
                        <ModalBody>
                            <Form onSubmit={sprintFormik.handleSubmit}>
                                <FormGroup className="mb-3">
                                    <Label for="nombre">Nombre base del Sprint</Label>
                                    <Input id="nombre" name="nombre" type="text" onChange={sprintFormik.handleChange} onBlur={sprintFormik.handleBlur} value={sprintFormik.values.nombre} invalid={sprintFormik.touched.nombre && !!sprintFormik.errors.nombre} />
                                    <small className="text-muted">Si creas varios, se usará este nombre como base (ej: "Sprint" → Sprint 1, Sprint 2…)</small>
                                </FormGroup>
                                <FormGroup className="mb-3">
                                    <Label for="cantidad">Cantidad de Sprints a crear</Label>
                                    <Input
                                        id="cantidad"
                                        name="cantidad"
                                        type="number"
                                        min={1}
                                        max={20}
                                        onChange={sprintFormik.handleChange}
                                        onBlur={sprintFormik.handleBlur}
                                        value={sprintFormik.values.cantidad}
                                        invalid={sprintFormik.touched.cantidad && !!sprintFormik.errors.cantidad}
                                    />
                                </FormGroup>
                                {Number(sprintFormik.values.cantidad) === 1 && (
                                    <>
                                        <FormGroup className="mb-3">
                                            <Label for="fecha_inicio">Fecha de Inicio (Opcional)</Label>
                                            <Input
                                                id="fecha_inicio"
                                                name="fecha_inicio"
                                                type="date"
                                                onChange={sprintFormik.handleChange}
                                                onBlur={sprintFormik.handleBlur}
                                                value={sprintFormik.values.fecha_inicio}
                                            />
                                        </FormGroup>
                                        <FormGroup className="mb-3">
                                            <Label for="fecha_fin">Fecha de Finalización (Opcional)</Label>
                                            <Input
                                                id="fecha_fin"
                                                name="fecha_fin"
                                                type="date"
                                                onChange={sprintFormik.handleChange}
                                                onBlur={sprintFormik.handleBlur}
                                                value={sprintFormik.values.fecha_fin}
                                            />
                                        </FormGroup>
                                    </>
                                )}
                                {Number(sprintFormik.values.cantidad) > 1 && (
                                    <div className="alert alert-info py-2 px-3 fs-13 mb-3">
                                        <i className="ri-information-line me-1"></i>
                                        Se crearán <strong>{sprintFormik.values.cantidad}</strong> sprints con nombres secuenciales automáticos.
                                    </div>
                                )}
                                <div className="d-flex justify-content-end gap-2">
                                    <Button type="button" color="secondary" onClick={() => setSprintModal(false)}>Cancelar</Button>
                                    <Button color="success" type="submit" disabled={submitLoading}>
                                        {submitLoading ? <Spinner size="sm" /> : `Crear ${Number(sprintFormik.values.cantidad) > 1 ? sprintFormik.values.cantidad + ' Sprints' : 'Sprint'}`}
                                    </Button>
                                </div>
                            </Form>
                        </ModalBody>
                    </Modal>

                    {/* Modal: Crear Tarea Técnica */}
                    <Modal isOpen={taskModal} toggle={() => setTaskModal(false)} centered>
                        <ModalHeader toggle={() => setTaskModal(false)}>Crear Tarea Técnica</ModalHeader>
                        <ModalBody>
                            <Form onSubmit={taskFormik.handleSubmit}>
                                <FormGroup className="mb-3">
                                    <Label for="titulo">Título de la Tarea</Label>
                                    <Input id="titulo" name="titulo" type="text" onChange={taskFormik.handleChange} onBlur={taskFormik.handleBlur} value={taskFormik.values.titulo} invalid={taskFormik.touched.titulo && !!taskFormik.errors.titulo} />
                                </FormGroup>
                                <FormGroup className="mb-3">
                                    <Label for="descripcion">Descripción</Label>
                                    <Input id="descripcion" name="descripcion" type="textarea" onChange={taskFormik.handleChange} onBlur={taskFormik.handleBlur} value={taskFormik.values.descripcion} />
                                </FormGroup>
                                <div className="d-flex justify-content-end gap-2">
                                    <Button type="button" color="secondary" onClick={() => setTaskModal(false)}>Cancelar</Button>
                                    <Button color="success" type="submit" disabled={submitLoading}>
                                        {submitLoading ? <Spinner size="sm" /> : "Crear Tarea"}
                                    </Button>
                                </div>
                            </Form>
                        </ModalBody>
                    </Modal>

                    {/* Modal: Editar Tarea Técnica */}
                    <Modal isOpen={editTaskModal} toggle={() => { setEditTaskModal(false); setEditingTask(null); }} centered>
                        <ModalHeader toggle={() => { setEditTaskModal(false); setEditingTask(null); }}>Editar Tarea Técnica</ModalHeader>
                        <ModalBody>
                            <Form onSubmit={editTaskFormik.handleSubmit}>
                                <FormGroup className="mb-3">
                                    <Label for="edit-titulo">Título de la Tarea</Label>
                                    <Input id="edit-titulo" name="titulo" type="text" onChange={editTaskFormik.handleChange} onBlur={editTaskFormik.handleBlur} value={editTaskFormik.values.titulo} invalid={editTaskFormik.touched.titulo && !!editTaskFormik.errors.titulo} />
                                </FormGroup>
                                <FormGroup className="mb-3">
                                    <Label for="edit-descripcion">Descripción</Label>
                                    <Input id="edit-descripcion" name="descripcion" type="textarea" onChange={editTaskFormik.handleChange} onBlur={editTaskFormik.handleBlur} value={editTaskFormik.values.descripcion} />
                                </FormGroup>
                                <div className="d-flex justify-content-end gap-2">
                                    <Button type="button" color="secondary" onClick={() => { setEditTaskModal(false); setEditingTask(null); }}>Cancelar</Button>
                                    <Button color="success" type="submit" disabled={submitLoading}>
                                        {submitLoading ? <Spinner size="sm" /> : "Guardar Cambios"}
                                    </Button>
                                </div>
                            </Form>
                        </ModalBody>
                    </Modal>

                    {/* Modal: Asignar a Sprint */}
                    <Modal isOpen={assignModal} toggle={() => setAssignModal(false)} centered>
                        <ModalHeader toggle={() => setAssignModal(false)}>Asignar Historia a Sprint</ModalHeader>
                        <ModalBody>
                            <Form onSubmit={handleAssignStory}>
                                <FormGroup className="mb-3">
                                    <Label for="sprintSelect">Selecciona el Sprint Destino</Label>
                                    <Input id="sprintSelect" type="select" value={targetSprintId} onChange={(e) => setTargetSprintId(e.target.value)} required>
                                        <option value="">-- Selecciona --</option>
                                        {sprints.map((s: any) => (
                                            <option key={s.id} value={s.id}>{s.nombre} ({s.status === 'planned' ? 'Planificado' : s.status === 'active' ? 'Activo' : 'Cerrado'})</option>
                                        ))}
                                    </Input>
                                </FormGroup>
                                <div className="d-flex justify-content-end gap-2">
                                    <Button type="button" color="secondary" onClick={() => setAssignModal(false)}>Cancelar</Button>
                                    <Button color="success" type="submit" disabled={submitLoading}>
                                        {submitLoading ? <Spinner size="sm" /> : "Asignar"}
                                    </Button>
                                </div>
                            </Form>
                        </ModalBody>
                    </Modal>

                    {/* Modal: Confirmación de Eliminación de Proyecto */}
                    <Modal isOpen={deleteProjModal} toggle={() => setDeleteProjModal(false)} centered>
                        <ModalHeader toggle={() => setDeleteProjModal(false)} className="bg-danger-subtle text-danger">Eliminar Proyecto</ModalHeader>
                        <ModalBody className="py-4">
                            <div className="text-center">
                                <div className="text-danger mb-3">
                                    <i className="ri-error-warning-line display-4"></i>
                                </div>
                                <h5>¿Estás seguro de que deseas eliminar este proyecto?</h5>
                                <p className="text-muted mb-0">Esta acción es irreversible y eliminará de forma permanente el proyecto, así como todos sus sprints, historias de usuario y tareas asociadas.</p>
                            </div>
                            <div className="d-flex justify-content-center gap-2 mt-4">
                                <Button color="light" onClick={() => setDeleteProjModal(false)} disabled={submitLoading}>
                                    Cancelar
                                </Button>
                                <Button color="danger" onClick={handleDeleteProject} disabled={submitLoading}>
                                    {submitLoading ? <Spinner size="sm" className="me-1" /> : null}
                                    Sí, eliminar proyecto
                                </Button>
                            </div>
                        </ModalBody>
                    </Modal>

                    {/* Modal de Confirmación Reutilizable (Pop-up) para Eliminaciones */}
                    <ConfirmModal
                        isOpen={confirmModalOpen}
                        title={confirmTitle}
                        message={confirmMessage}
                        loading={submitLoading}
                        onConfirm={confirmAction}
                        onCancel={() => setConfirmModalOpen(false)}
                    />

                </Container>
            </div>
        </React.Fragment>
    );
};

export default ProjectDetail;

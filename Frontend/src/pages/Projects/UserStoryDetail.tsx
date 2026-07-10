import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, CardBody, Button, Modal, ModalHeader, ModalBody, Form, FormGroup, Label, Input, Alert, Spinner, Badge } from 'reactstrap';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import { getProjectDetail, createTechnicalTask, updateTechnicalTask, updateTechnicalTaskStatus, updateUserStoryStatus, updateUserStory, getUsersList } from '../../helpers/fakebackend_helper';
import * as Yup from 'yup';
import { useFormik } from 'formik';

const UserStoryDetail = () => {
    const { id, storyId } = useParams<{ id: string; storyId: string }>();
    const navigate = useNavigate();
    const [project, setProject] = useState<any>(null);
    const [systemUsers, setSystemUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setErrorState] = useState<string>("");
    const setError = (msg: string) => {
        setErrorState(msg);
        if (msg) {
            setTimeout(() => {
                setErrorState(prev => prev === msg ? "" : prev);
            }, 4000);
        }
    };

    // Modales
    const [taskModal, setTaskModal] = useState<boolean>(false);
    const [editTaskModal, setEditTaskModal] = useState<boolean>(false);
    const [editingTask, setEditingTask] = useState<any>(null);
    const [submitLoading, setSubmitLoading] = useState<boolean>(false);

    // Estado para edición de descripción
    const [isEditingDesc, setIsEditingDesc] = useState<boolean>(false);
    const [descValue, setDescValue] = useState<string>("");

    const fetchProjectDetails = useCallback(async () => {
        if (!id) return;
        try {
            setLoading(true);
            const [projResp, usersResp]: any = await Promise.all([
                getProjectDetail(id),
                getUsersList()
            ]);
            setProject(projResp);
            setSystemUsers(usersResp || []);
        } catch (err: any) {
            setError(err.message || err || "Error al obtener detalles del proyecto");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchProjectDetails();
    }, [id, fetchProjectDetails]);

    // Encontrar la historia y sus tareas
    const story = project?.historias?.find((h: any) => h.id === storyId);
    const storyTasks = project?.tareas?.filter((t: any) => t.historia_id === storyId) || [];
    
    // Inicializar descripción cuando cambie la historia
    useEffect(() => {
        if (story) {
            setDescValue(story.descripcion || "");
        }
    }, [story]);

    // Calcular identificador HU-X
    const storyIndex = project?.historias?.findIndex((h: any) => h.id === storyId);
    const storyIdentifier = storyIndex !== undefined && storyIndex !== -1 ? `HU-${storyIndex + 1}` : "";

    // Formik: Crear Tarea Técnica
    const taskFormik = useFormik({
        initialValues: { titulo: '', estimated_hours: 1, descripcion: '' },
        validationSchema: Yup.object({
            titulo: Yup.string().required("Título requerido"),
        }),
        onSubmit: async (values, { resetForm }) => {
            if (!id || !storyId) return;
            try {
                setSubmitLoading(true);
                await createTechnicalTask(id, storyId, values);
                resetForm();
                setTaskModal(false);
                fetchProjectDetails();
            } catch (err: any) {
                setError(err.message || err || "Error al crear tarea técnica");
            } finally {
                setSubmitLoading(false);
            }
        }
    });

    // Formik: Editar Tarea Técnica
    const editTaskFormik = useFormik({
        initialValues: {
            titulo: editingTask ? editingTask.titulo : '',
            estimated_hours: editingTask ? editingTask.estimated_hours : 1,
            descripcion: editingTask ? editingTask.descripcion || '' : ''
        },
        enableReinitialize: true,
        validationSchema: Yup.object({
            titulo: Yup.string().required("Título requerido"),
        }),
        onSubmit: async (values) => {
            if (!id || !editingTask) return;
            try {
                setSubmitLoading(true);
                await updateTechnicalTask(id, editingTask.id, values);
                setEditTaskModal(false);
                setEditingTask(null);
                fetchProjectDetails();
            } catch (err: any) {
                setError(err.message || err || "Error al editar tarea técnica");
            } finally {
                setSubmitLoading(false);
            }
        }
    });

    const handleUpdateStoryStatus = async (status: string) => {
        if (!id || !storyId) return;
        try {
            await updateUserStoryStatus(id, storyId, status);
            fetchProjectDetails();
        } catch (err: any) {
            setError(err.message || err || "Error al actualizar estado de la historia");
        }
    };

    const handleSaveDescription = async () => {
        if (!id || !storyId || !story) return;
        try {
            setSubmitLoading(true);
            await updateUserStory(id, storyId, {
                titulo: story.titulo,
                story_points: story.story_points,
                descripcion: descValue
            });
            setIsEditingDesc(false);
            fetchProjectDetails();
        } catch (err: any) {
            setError(err.message || err || "Error al actualizar la descripción");
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleUpdateTaskStatus = async (taskId: string, status: string) => {
        if (!id) return;
        try {
            await updateTechnicalTaskStatus(id, taskId, status);
            fetchProjectDetails();
        } catch (err: any) {
            setError(err.message || err || "Error al actualizar estado de la tarea");
        }
    };

    if (loading) {
        return (
            <div className="page-content d-flex justify-content-center align-items-center" style={{ minHeight: "80vh" }}>
                <Spinner color="primary" />
            </div>
        );
    }

    if (!story) {
        return (
            <div className="page-content">
                <Container fluid>
                    <Alert color="danger">Historia de usuario no encontrada.</Alert>
                    <Button color="primary" onClick={() => navigate(`/projects/${id}/backlog`)}>Volver al Backlog</Button>
                </Container>
            </div>
        );
    }

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

    const renderUserRoleBadges = () => {
        const asignados = story.asignados || (story.asignado_a ? [story.asignado_a] : []);
        if (!asignados.length || !project?.miembros) return <span className="text-muted fs-12 fst-italic">Sin asignar</span>;
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
                        <Badge key={asignadoId} color={getRoleBadgeColor(role)} className="text-uppercase text-white" style={{ fontSize: '11px' }} title={userObj ? `${userObj.name} (${userObj.email})` : ""}>
                            {label}
                        </Badge>
                    );
                })}
            </div>
        );
    };

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title={storyIdentifier ? `${storyIdentifier}: ${story.titulo}` : story.titulo} pageTitle="Proyecto" link={`/projects/${id}/backlog`} />

                    <div className="mb-3">
                        <Button color="light" onClick={() => navigate(`/projects/${id}/backlog`)}>
                            <i className="ri-arrow-left-line align-bottom me-1"></i> Volver al Backlog
                        </Button>
                    </div>

                    {error && <Alert color="danger" toggle={() => setError("")}>{error}</Alert>}

                    <Row>
                        {/* Columna Izquierda: Detalle de la Historia */}
                        <Col lg={8}>
                            <Card>
                                <CardBody>
                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <h4 className="card-title mb-0">
                                            {storyIdentifier && <span className="text-muted me-2">{storyIdentifier}:</span>}
                                            {story.titulo}
                                        </h4>
                                        <div className="d-flex align-items-center gap-3">
                                            <Badge color="info" className="px-3 py-2 fs-13">{story.story_points} Puntos</Badge>
                                            <Input 
                                                type="select" 
                                                className={`form-select ${getStoryStatusClass(story.status)}`}
                                                style={{ width: '150px' }}
                                                value={story.status} 
                                                onChange={(e) => handleUpdateStoryStatus(e.target.value)}
                                            >
                                                <option value="pending">Pendiente</option>
                                                <option value="in_progress">En Progreso</option>
                                                <option value="done">Completada</option>
                                            </Input>
                                        </div>
                                    </div>

                                    <div className="d-flex align-items-center gap-2 mb-4">
                                        <span className="text-muted fs-12">Asignados:</span>
                                        {renderUserRoleBadges()}
                                    </div>

                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                        <h5 className="fs-14 text-muted mb-0">Descripción de la Historia</h5>
                                        {!isEditingDesc && (
                                            <Button color="link" size="sm" className="p-0 text-decoration-none" onClick={() => setIsEditingDesc(true)}>
                                                <i className="ri-pencil-line align-bottom me-1"></i> Editar Descripción
                                            </Button>
                                        )}
                                    </div>
                                    {isEditingDesc ? (
                                        <div className="p-3 bg-light rounded mb-0">
                                            <Input
                                                type="textarea"
                                                rows="12"
                                                className="form-control mb-3"
                                                value={descValue}
                                                onChange={(e) => setDescValue(e.target.value)}
                                                placeholder="Ingresa la descripción detallada de la historia de usuario..."
                                                style={{ resize: 'vertical' }}
                                            />
                                            <div className="d-flex gap-2">
                                                <Button color="success" size="sm" onClick={handleSaveDescription} disabled={submitLoading}>
                                                    {submitLoading ? <Spinner size="sm" className="me-1" /> : null}
                                                    Guardar
                                                </Button>
                                                <Button color="light" size="sm" onClick={() => {
                                                    setIsEditingDesc(false);
                                                    setDescValue(story.descripcion || "");
                                                }} disabled={submitLoading}>
                                                    Cancelar
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-light rounded mb-0" style={{ minHeight: '150px', whiteSpace: 'pre-wrap' }}>
                                            {story.descripcion || <span className="text-muted fst-italic">Sin descripción detallada.</span>}
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        </Col>

                        {/* Columna Derecha: Tareas Técnicas */}
                        <Col lg={4}>
                            <Card>
                                <CardBody>
                                    <div className="d-flex align-items-center justify-content-between mb-4">
                                        <h5 className="card-title mb-0">Tareas Técnicas</h5>
                                        <Button color="success" size="sm" onClick={() => setTaskModal(true)}>
                                            <i className="ri-add-line align-bottom me-1"></i> Nueva Tarea
                                        </Button>
                                    </div>

                                    {storyTasks.length === 0 ? (
                                        <div className="text-center py-4">
                                            <p className="text-muted">No hay tareas técnicas para esta historia.</p>
                                        </div>
                                    ) : (
                                        <div className="d-flex flex-column gap-3">
                                            {storyTasks.map((tarea: any) => {
                                                const originalIndex = project?.tareas?.findIndex((t: any) => t.id === tarea.id);
                                                const tareaId = originalIndex !== undefined && originalIndex !== -1 ? `T-${originalIndex + 1}` : "";
                                                return (
                                                    <Card className="border shadow-none mb-0" key={tarea.id}>
                                                        <CardBody className="p-3">
                                                            <div className="d-flex align-items-center justify-content-between mb-2">
                                                                <strong className="fs-14">
                                                                    {tareaId && <span className="text-muted me-1">{tareaId}:</span>}
                                                                    {tarea.titulo}
                                                                </strong>
                                                                <Input 
                                                                    type="select" 
                                                                    bsSize="sm" 
                                                                    className="form-select-sm border-info text-info" 
                                                                    style={{ width: '120px' }}
                                                                    value={tarea.status} 
                                                                    onChange={(e) => handleUpdateTaskStatus(tarea.id, e.target.value)}
                                                                >
                                                                    <option value="pending">Pendiente</option>
                                                                    <option value="in_progress">En Progreso</option>
                                                                    <option value="done">Completada</option>
                                                                </Input>
                                                            </div>
                                                            <p className="text-muted fs-13 mb-3">{tarea.descripcion || <span className="text-muted fst-italic">Sin descripción</span>}</p>
                                                            <div className="d-flex justify-content-end">
                                                                <Button color="primary" size="sm" onClick={() => {
                                                                    setEditingTask(tarea);
                                                                    setEditTaskModal(true);
                                                                }}>
                                                                    <i className="ri-pencil-line me-1"></i>Editar Tarea
                                                                </Button>
                                                            </div>
                                                        </CardBody>
                                                    </Card>
                                                );
                                            })}
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>

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

                </Container>
            </div>
        </React.Fragment>
    );
};

export default UserStoryDetail;

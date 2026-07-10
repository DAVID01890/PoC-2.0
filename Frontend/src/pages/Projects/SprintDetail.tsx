import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Row, Col, Card, CardBody, Button, Alert, Spinner, Badge, Table, Progress, Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import { getProjectDetail, startSprint, closeSprint, reopenSprint, updateSprintStatus } from '../../helpers/fakebackend_helper';

const SprintDetail = () => {
    const { id, sprintId } = useParams<{ id: string; sprintId: string }>();
    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setErrorState] = useState<string>("");
    const [submitLoading, setSubmitLoading] = useState<boolean>(false);
    const [statusDropdownOpen, setStatusDropdownOpen] = useState<boolean>(false);
    const toggleStatusDropdown = () => setStatusDropdownOpen(prevState => !prevState);

    const setError = (msg: string) => {
        setErrorState(msg);
        if (msg) {
            setTimeout(() => {
                setErrorState(prev => prev === msg ? "" : prev);
            }, 4000);
        }
    };

    const fetchProjectDetails = useCallback(async () => {
        if (!id) return;
        try {
            setLoading(true);
            const response: any = await getProjectDetail(id);
            setProject(response);
        } catch (err: any) {
            setError(err.message || err || "Error al obtener detalles del proyecto");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchProjectDetails();
    }, [id, fetchProjectDetails]);

    // Encontrar el sprint
    const sprint = project?.sprints?.find((s: any) => s.id === sprintId);

    // Obtener historias asignadas a este sprint
    const sprintStories = project?.historias?.filter((h: any) => sprint?.backlog?.includes(h.id)) || [];

    const handleStartSprint = async () => {
        if (!id || !sprintId) return;
        try {
            setSubmitLoading(true);
            await startSprint(id, sprintId);
            fetchProjectDetails();
        } catch (err: any) {
            setError(err.message || err || "Error al iniciar el sprint");
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleCloseSprint = async () => {
        if (!id || !sprintId) return;
        try {
            setSubmitLoading(true);
            await closeSprint(id, sprintId);
            fetchProjectDetails();
        } catch (err: any) {
            setError(err.message || err || "Error al cerrar el sprint");
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleReopenSprint = async () => {
        if (!id || !sprintId) return;
        try {
            setSubmitLoading(true);
            await reopenSprint(id, sprintId);
            fetchProjectDetails();
        } catch (err: any) {
            setError(err.message || err || "Error al reabrir el sprint");
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleUpdateSprintStatus = async (status: string) => {
        if (!id || !sprintId) return;

        // Si se intenta activar el sprint, verificar si ya hay otro activo
        if (status === 'active') {
            const alreadyActiveSprint = (project?.sprints || []).find((s: any) => s.status === 'active' && s.id !== sprintId);
            if (alreadyActiveSprint) {
                setError(`No se puede activar este sprint porque ya existe un sprint activo ("${alreadyActiveSprint.nombre}"). Cierra el sprint activo actual antes de activar otro.`);
                return;
            }
        }

        try {
            setSubmitLoading(true);
            await updateSprintStatus(id, sprintId, status);
            fetchProjectDetails();
        } catch (err: any) {
            setError(err.message || err || "Error al actualizar el estado del sprint");
        } finally {
            setSubmitLoading(false);
        }
    };

    const renderStatusDropdown = () => {
        if (!sprint) return null;
        
        let color = "warning";
        let text = "Planificado";
        if (sprint.status === 'active') {
            color = "success";
            text = "Activo";
        } else if (sprint.status === 'closed') {
            color = "danger";
            text = "Cerrado";
        }

        return (
            <Dropdown isOpen={statusDropdownOpen} toggle={toggleStatusDropdown}>
                <DropdownToggle 
                    tag="button" 
                    className={`btn btn-${color} text-uppercase px-3 py-2 fs-12 d-flex align-items-center gap-1 border-0`}
                    disabled={submitLoading}
                >
                    {text} <i className="ri-arrow-down-s-line align-middle"></i>
                </DropdownToggle>
                <DropdownMenu strategy="fixed" className="dropdown-menu-end">
                    <DropdownItem 
                        active={sprint.status === 'planned'} 
                        onClick={() => handleUpdateSprintStatus('planned')}
                    >
                        Planificado
                    </DropdownItem>
                    <DropdownItem 
                        active={sprint.status === 'active'} 
                        onClick={() => handleUpdateSprintStatus('active')}
                    >
                        Activo
                    </DropdownItem>
                    <DropdownItem 
                        active={sprint.status === 'closed'} 
                        onClick={() => handleUpdateSprintStatus('closed')}
                    >
                        Cerrado
                    </DropdownItem>
                </DropdownMenu>
            </Dropdown>
        );
    };

    // Calcular estadísticas
    const totalStories = sprintStories.length;
    const completedStories = sprintStories.filter((h: any) => h.status === 'completed').length;
    const progressPercentage = totalStories > 0 ? Math.round((completedStories / totalStories) * 100) : 0;

    document.title = `${sprint ? sprint.nombre : 'Cargando Sprint...'} | Detalles de Sprint`;

    if (loading) {
        return (
            <div className="page-content d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
                <Spinner color="primary" style={{ width: '3rem', height: '3rem' }} />
                <h5 className="mt-3 text-muted fw-normal">Cargando detalles del sprint...</h5>
            </div>
        );
    }

    if (!sprint) {
        return (
            <div className="page-content">
                <Container>
                    <Alert color="danger">Sprint no encontrado en el proyecto.</Alert>
                    <Link to={`/projects/${id}/backlog`} className="btn btn-primary mt-2">
                        <i className="ri-arrow-left-line me-1"></i> Volver al Backlog
                    </Link>
                </Container>
            </div>
        );
    }

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title={sprint.nombre} pageTitle="Sprints" />

                    {error && <Alert color="danger" className="mb-4">{error}</Alert>}

                    <Row>
                        <Col lg={8}>
                            <Card className="border shadow-none">
                                <CardBody className="p-4">
                                    <div className="d-flex align-items-center justify-content-between mb-4">
                                        <div className="d-flex align-items-center gap-3">
                                            <div className="avatar-sm">
                                                <span className="avatar-title bg-info-subtle text-info rounded-circle fs-20">
                                                    <i className="ri-run-line"></i>
                                                </span>
                                            </div>
                                            <div>
                                                <h4 className="card-title mb-1">{sprint.nombre}</h4>
                                                <p className="text-muted mb-0 fs-13">ID: {sprint.id}</p>
                                            </div>
                                        </div>
                                        <div>
                                            {renderStatusDropdown()}
                                        </div>
                                    </div>

                                    <h5 className="card-title mb-3 fs-15">Historias de Usuario del Sprint</h5>

                                    <div className="table-responsive table-card">
                                        <Table className="table-striped align-middle mb-0">
                                            <thead className="table-light text-muted">
                                                <tr>
                                                    <th>ID</th>
                                                    <th>Título</th>
                                                    <th>Puntos</th>
                                                    <th>Estado</th>
                                                    <th>Acción</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sprintStories.map((h: any) => {
                                                    const originalIndex = project?.historias?.findIndex((x: any) => x.id === h.id);
                                                    const globalId = originalIndex !== -1 ? `HU-${originalIndex + 1}` : `HU-${h.id.slice(0, 4)}`;
                                                    return (
                                                        <tr key={h.id}>
                                                            <td>
                                                                <span className="text-muted fw-semibold">{globalId}</span>
                                                            </td>
                                                            <td>
                                                                <Link to={`/projects/${id}/stories/${h.id}`} className="fw-semibold text-body text-decoration-none hover-text-primary">
                                                                    {h.titulo}
                                                                </Link>
                                                            </td>
                                                            <td>
                                                                <Badge color="info" className="px-2 py-1 fs-12">{h.story_points} Puntos</Badge>
                                                            </td>
                                                            <td>
                                                                <Badge
                                                                    color={
                                                                        h.status === 'completed' || h.status === 'done' ? 'success' :
                                                                            h.status === 'in_progress' ? 'warning' : 'secondary'
                                                                    }
                                                                    className="text-uppercase"
                                                                >
                                                                    {h.status === 'completed' || h.status === 'done' ? 'Completada' :
                                                                        h.status === 'in_progress' ? 'En Progreso' : 'Pendiente'}
                                                                </Badge>
                                                            </td>
                                                            <td>
                                                                <Link to={`/projects/${id}/stories/${h.id}`} className="btn btn-outline-primary btn-sm">
                                                                    <i className="ri-eye-line align-middle me-1"></i> Ver HU
                                                                </Link>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {sprintStories.length === 0 && (
                                                    <tr>
                                                        <td colSpan={5} className="text-center py-4 text-muted">
                                                            No hay historias asignadas a este sprint.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </Table>
                                    </div>
                                </CardBody>
                            </Card>
                        </Col>

                        <Col lg={4}>
                            <Card className="border shadow-none">
                                <CardBody className="p-4">
                                    <h5 className="card-title mb-4">Información y Control</h5>

                                    <div className="mb-4">
                                        <label className="text-muted text-uppercase fs-11 fw-semibold mb-2">Progreso del Sprint</label>
                                        <div className="d-flex align-items-center gap-3">
                                            <Progress value={progressPercentage} color="info" className="flex-grow-1 progress-sm" style={{ height: '8px' }} />
                                            <span className="fw-semibold text-body fs-13">{progressPercentage}%</span>
                                        </div>
                                        <small className="text-muted mt-1 d-block">{completedStories} de {totalStories} historias completadas</small>
                                    </div>

                                    <div className="mb-4">
                                        <label className="text-muted text-uppercase fs-11 fw-semibold mb-1">Fecha de Inicio</label>
                                        <p className="fs-14 fw-medium text-body mb-0">
                                            {sprint.fecha_inicio ? new Date(sprint.fecha_inicio).toLocaleDateString() : 'No establecida'}
                                        </p>
                                    </div>

                                    <div className="mb-4">
                                        <label className="text-muted text-uppercase fs-11 fw-semibold mb-1">Fecha de Finalización</label>
                                        <p className="fs-14 fw-medium text-body mb-0">
                                            {sprint.fecha_fin ? new Date(sprint.fecha_fin).toLocaleDateString() : 'No establecida'}
                                        </p>
                                    </div>

                                    <hr className="my-4 border-light-subtle" />

                                    <div className="d-flex flex-column gap-2">
                                        {sprint.status === 'planned' && (
                                            <Button color="success" onClick={handleStartSprint} disabled={submitLoading} className="w-100">
                                                {submitLoading ? <Spinner size="sm" /> : "Iniciar Sprint"}
                                            </Button>
                                        )}
                                        {sprint.status === 'active' && (
                                            <Button color="danger" onClick={handleCloseSprint} disabled={submitLoading} className="w-100">
                                                {submitLoading ? <Spinner size="sm" /> : "Cerrar Sprint"}
                                            </Button>
                                        )}
                                        {sprint.status === 'closed' && (
                                            <Button color="warning" onClick={handleReopenSprint} disabled={submitLoading} className="w-100">
                                                {submitLoading ? <Spinner size="sm" /> : "Reabrir Sprint"}
                                            </Button>
                                        )}
                                        <Link to={`/projects/${id}/backlog`} className="btn btn-outline-secondary w-100">
                                            <i className="ri-arrow-left-line me-1"></i> Volver al Backlog
                                        </Link>
                                    </div>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>
        </React.Fragment>
    );
};

export default SprintDetail;

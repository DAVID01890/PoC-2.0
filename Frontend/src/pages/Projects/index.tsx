import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, CardBody, Button, Modal, ModalHeader, ModalBody, Form, FormGroup, Label, Input, Alert, Spinner, Badge } from 'reactstrap';
import { Link, useNavigate } from 'react-router-dom';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import { getProjects, createProject } from '../../helpers/fakebackend_helper';
import * as Yup from 'yup';
import { useFormik } from 'formik';

const PROJECTS_ORDER_KEY = 'projectsOrder';

const getStoredOrder = (): string[] => {
    try {
        const raw = localStorage.getItem(PROJECTS_ORDER_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
};

const saveStoredOrder = (ids: string[]) => {
    localStorage.setItem(PROJECTS_ORDER_KEY, JSON.stringify(ids));
    window.dispatchEvent(new Event('projectOrderChanged'));
};

const applyOrder = (allProjects: any[], order: string[]): any[] => {
    if (!order.length) return allProjects;
    const map = new Map(allProjects.map(p => [p.id, p]));
    const ordered: any[] = [];
    order.forEach(id => { if (map.has(id)) ordered.push(map.get(id)); });
    allProjects.forEach(p => { if (!order.includes(p.id)) ordered.unshift(p); });
    return ordered;
};


const ProjectsList = () => {
    document.title = "Inicio | Luma - Scrum Manager";

    const navigate = useNavigate();
    const [projects, setProjects] = useState<any[]>([]);
    const [orderedProjects, setOrderedProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");
    const [modal, setModal] = useState<boolean>(false);
    const [submitLoading, setSubmitLoading] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const dragCounter = useRef(0);


    const toggleModal = () => setModal(!modal);

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const response: any = await getProjects();
            const all = response || [];
            setProjects(all);
            setOrderedProjects(applyOrder(all, getStoredOrder()));
        } catch (err: any) {
            setError(err.message || err || "Error al obtener proyectos");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    useEffect(() => {
        const handleProjectDataChanged = () => {
            fetchProjects();
        };
        window.addEventListener("projectDataChanged", handleProjectDataChanged);
        return () => {
            window.removeEventListener("projectDataChanged", handleProjectDataChanged);
        };
    }, []);

    const formik = useFormik({
        initialValues: {
            nombre: '',
            descripcion: '',
        },
        validationSchema: Yup.object({
            nombre: Yup.string().required("Por favor ingrese el nombre del proyecto"),
            descripcion: Yup.string().required("Por favor ingrese la descripcion del proyecto"),
        }),
        onSubmit: async (values, { resetForm }) => {
            try {
                setSubmitLoading(true);
                const newProject: any = await createProject(values);
                resetForm();
                toggleModal();
                const response: any = await getProjects();
                const all = response || [];
                setProjects(all);
                const newId = newProject?.id;
                const currentOrder = getStoredOrder();
                const updatedOrder = newId
                    ? [newId, ...currentOrder.filter((id: string) => id !== newId)]
                    : currentOrder;
                saveStoredOrder(updatedOrder);
                setOrderedProjects(applyOrder(all, updatedOrder));
            } catch (err: any) {
                setError(err.message || err || "Error al crear el proyecto");
            } finally {
                setSubmitLoading(false);
            }
        }
    });

    // Drag & Drop
    const handleDragStart = (e: React.DragEvent, projectId: string) => {
        setDraggingId(projectId);
        e.dataTransfer.effectAllowed = 'move';
    };
    const handleDragEnd = () => { setDraggingId(null); setDragOverId(null); dragCounter.current = 0; };
    const handleDragEnter = (e: React.DragEvent, projectId: string) => {
        e.preventDefault();
        dragCounter.current++;
        if (draggingId !== projectId) setDragOverId(projectId);
    };
    const handleDragLeave = () => {
        dragCounter.current--;
        if (dragCounter.current <= 0) { setDragOverId(null); dragCounter.current = 0; }
    };
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
    const handleDrop = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        dragCounter.current = 0;
        setDragOverId(null);
        if (!draggingId || draggingId === targetId) { setDraggingId(null); return; }
        const newOrder = [...orderedProjects];
        const fromIdx = newOrder.findIndex(p => p.id === draggingId);
        const toIdx = newOrder.findIndex(p => p.id === targetId);
        if (fromIdx < 0 || toIdx < 0) { setDraggingId(null); return; }
        const [moved] = newOrder.splice(fromIdx, 1);
        newOrder.splice(toIdx, 0, moved);
        setOrderedProjects(newOrder);
        setDraggingId(null);
        saveStoredOrder(newOrder.map(p => p.id));
    };

    // Filtrar proyectos
    const filteredProjects = orderedProjects.filter((p: any) =>
        p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Calcular métricas
    const totalProjects = projects.length;
    const totalMembers = projects.reduce((acc, p) => acc + (p.miembros?.length || 1), 0);
    const totalSprints = projects.reduce((acc, p) => acc + (p.sprints?.length || 0), 0);

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    {/* Consistent Breadcrumb */}
                    <BreadCrumb title="Inicio" pageTitle="Scrum Workspace" />

                    {error && <Alert color="danger" toggle={() => setError("")}>{error}</Alert>}



                    {/* Section Header with Search & Add button */}
                    <Card className="border shadow-none mb-4">
                        <CardBody className="p-3">
                            <Row className="align-items-center g-3">
                                <Col md={4}>
                                    <h5 className="card-title mb-0">Mis Proyectos</h5>
                                    {!searchQuery && orderedProjects.length > 1 && (
                                        <p className="text-muted fs-12 mb-0 mt-1">
                                            <i className="ri-drag-move-2-line me-1"></i>Arrastra para reordenar
                                        </p>
                                    )}
                                </Col>
                                <Col md={4} className="ms-auto">
                                    <div className="position-relative">
                                        <Input 
                                            type="text" 
                                            placeholder="Buscar proyectos..." 
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="form-control pe-5 rounded-pill"
                                        />
                                        <i className="ri-search-line position-absolute top-50 translate-middle-y text-muted" style={{ right: '15px' }}></i>
                                    </div>
                                </Col>
                                <Col md="auto">
                                    <Button 
                                        color="success" 
                                        onClick={toggleModal}
                                        className="w-100"
                                    >
                                        <i className="ri-add-line align-bottom me-1"></i> Nuevo Proyecto
                                    </Button>
                                </Col>
                            </Row>
                        </CardBody>
                    </Card>

                    {/* Projects Cards Grid */}
                    {loading ? (
                        <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: "30vh" }}>
                            <Spinner color="primary" />
                            <p className="mt-3 text-muted">Cargando proyectos...</p>
                        </div>
                    ) : filteredProjects.length === 0 ? (
                        <Card className="border shadow-none">
                            <CardBody className="text-center py-5">
                                <i className="ri-folder-open-line display-4 text-muted"></i>
                                <h5 className="mt-3">No se encontraron proyectos</h5>
                                <p className="text-muted mx-auto" style={{ maxWidth: "350px" }}>
                                    {searchQuery ? "No hay resultados que coincidan con tu búsqueda." : "Comienza creando tu primer proyecto Scrum haciendo clic en 'Nuevo Proyecto'."}
                                </p>
                            </CardBody>
                        </Card>
                    ) : (
                        <Row>
                            {filteredProjects.map((proj: any) => (
                                <Col lg={4} md={6} key={proj.id} className="mb-4"
                                    draggable={!searchQuery}
                                    onDragStart={(e) => handleDragStart(e, proj.id)}
                                    onDragEnd={handleDragEnd}
                                    onDragEnter={(e) => handleDragEnter(e, proj.id)}
                                    onDragLeave={handleDragLeave}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, proj.id)}
                                    style={{ opacity: draggingId === proj.id ? 0.35 : 1, cursor: searchQuery ? 'default' : 'grab', transition: 'opacity 0.2s' }}
                                >
                                    <Card className={`card-animate border shadow-none h-100 ${dragOverId === proj.id && draggingId !== proj.id ? 'border-primary' : ''}`}
                                        style={{ transform: dragOverId === proj.id && draggingId !== proj.id ? 'scale(1.02)' : 'scale(1)', transition: 'transform 0.15s' }}
                                    >
                                        <CardBody className="p-4 d-flex flex-column justify-content-between">
                                            <div>
                                                <div className="d-flex align-items-center mb-3">
                                                    <div className="avatar-sm flex-shrink-0">
                                                        <span className="avatar-title bg-info-subtle text-info rounded-circle fs-18">
                                                            <i className="ri-git-branch-line"></i>
                                                        </span>
                                                    </div>
                                                    <div className="flex-grow-1 ms-3">
                                                        <h5 className="fs-15 mb-1 text-truncate">
                                                            <Link to={`/projects/${proj.id}/backlog`} className="text-body fw-bold">{proj.nombre}</Link>
                                                        </h5>
                                                        <p className="text-muted text-truncate mb-0" style={{ fontSize: "11px" }}>ID: {proj.id.substring(0, 8).toUpperCase()}...</p>
                                                    </div>
                                                </div>
                                                {proj.descripcion && (
                                                    <p className="text-muted mb-4 fs-13" style={{ 
                                                        minHeight: "38px",
                                                        display: "-webkit-box",
                                                        WebkitLineClamp: "2",
                                                        WebkitBoxOrient: "vertical",
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        lineHeight: "1.5"
                                                    }}>
                                                        {proj.descripcion}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="mt-auto">
                                                <div className="d-flex align-items-center justify-content-between mb-3 pt-2 border-top">
                                                    <span className="text-muted fs-12">
                                                        <i className="ri-user-line me-1 align-middle"></i> {proj.miembros?.length || 1} {proj.miembros?.length === 1 ? 'Miembro' : 'Miembros'}
                                                    </span>
                                                    <Badge color="info" className="px-2 py-1">Scrum</Badge>
                                                </div>
                                                <Link to={`/projects/${proj.id}/backlog`} className="btn btn-outline-primary btn-sm w-100">
                                                    Ver Scrum Board <i className="ri-arrow-right-line align-middle ms-1"></i>
                                                </Link>
                                            </div>
                                        </CardBody>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    )}

                    {/* Create Project Modal */}
                    <Modal isOpen={modal} toggle={toggleModal} centered>
                        <ModalHeader toggle={toggleModal}>Crear Nuevo Proyecto</ModalHeader>
                        <ModalBody>
                            <Form onSubmit={formik.handleSubmit}>
                                <FormGroup className="mb-3">
                                    <Label for="nombre">Nombre del Proyecto</Label>
                                    <Input
                                        id="nombre"
                                        name="nombre"
                                        placeholder="Ingrese el nombre del proyecto"
                                        type="text"
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        value={formik.values.nombre}
                                        invalid={formik.touched.nombre && !!formik.errors.nombre}
                                    />
                                    {formik.touched.nombre && formik.errors.nombre ? (
                                        <div className="invalid-feedback">{formik.errors.nombre}</div>
                                    ) : null}
                                </FormGroup>
                                <FormGroup className="mb-3">
                                    <Label for="descripcion">Descripción del Proyecto</Label>
                                    <Input
                                        id="descripcion"
                                        name="descripcion"
                                        placeholder="Ingrese la descripción del proyecto"
                                        type="textarea"
                                        rows="4"
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        value={formik.values.descripcion}
                                        invalid={formik.touched.descripcion && !!formik.errors.descripcion}
                                    />
                                    {formik.touched.descripcion && formik.errors.descripcion ? (
                                        <div className="invalid-feedback">{formik.errors.descripcion}</div>
                                    ) : null}
                                </FormGroup>
                                <div className="text-end">
                                    <Button color="light" className="me-2" onClick={toggleModal} disabled={submitLoading}>
                                        Cancelar
                                    </Button>
                                    <Button color="success" type="submit" disabled={submitLoading}>
                                        {submitLoading ? <Spinner size="sm" /> : "Crear Proyecto"}
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

export default ProjectsList;

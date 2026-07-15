import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Row, Col, Card, CardBody, Button, Alert, Spinner, Badge, Progress, Dropdown, DropdownMenu, DropdownToggle, DropdownItem, Input } from 'reactstrap';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import { getProjectDetail, startSprint, closeSprint, reopenSprint, updateSprintStatus } from '../../helpers/fakebackend_helper';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getPaginationRowModel,
    getFilteredRowModel,
    flexRender,
    createColumnHelper,
    SortingState,
    PaginationState
} from '@tanstack/react-table';

const columnHelper = createColumnHelper<any>();

const SprintDetail = () => {
    const { id, sprintId } = useParams<{ id: string; sprintId: string }>();
    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setErrorState] = useState<string>("");
    const [submitLoading, setSubmitLoading] = useState<boolean>(false);
    const [statusDropdownOpen, setStatusDropdownOpen] = useState<boolean>(false);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState("");
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });
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
    const sprint = useMemo(() => project?.sprints?.find((s: any) => s.id === sprintId), [project, sprintId]);

    // Obtener historias asignadas a este sprint (memoized to prevent infinite re-renders)
    const sprintStories = useMemo(() => 
        project?.historias?.filter((h: any) => sprint?.backlog?.includes(h.id)) || [],
        [project?.historias, sprint?.backlog]
    );

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

    // columnHelper is defined outside the component to avoid re-creation on every render

    const columns = useMemo(() => [
        columnHelper.accessor('id', {
            header: 'ID',
            cell: info => {
                const h = info.row.original;
                const originalIndex = project?.historias?.findIndex((x: any) => x.id === h.id);
                const globalId = originalIndex !== -1 ? `HU-${originalIndex + 1}` : `HU-${h.id.slice(0, 4)}`;
                return <span className="text-muted fw-semibold">{globalId}</span>;
            },
            enableSorting: false,
        }),
        columnHelper.accessor('titulo', {
            header: 'Título',
            cell: info => {
                const h = info.row.original;
                return (
                    <Link to={`/projects/${id}/stories/${h.id}`} className="fw-semibold text-body text-decoration-none hover-text-primary">
                        {info.getValue()}
                    </Link>
                );
            },
        }),
        columnHelper.accessor('story_points', {
            header: 'Puntos',
            cell: info => <Badge color="info" className="px-2 py-1 fs-12">{info.getValue()} Puntos</Badge>,
        }),
        columnHelper.accessor('status', {
            header: 'Estado',
            cell: info => {
                const status = info.getValue();
                return (
                    <Badge
                        color={status === 'completed' || status === 'done' ? 'success' :
                            status === 'in_progress' ? 'warning' : 'secondary'}
                        className="text-uppercase"
                    >
                        {status === 'completed' || status === 'done' ? 'Completada' :
                            status === 'in_progress' ? 'En Progreso' : 'Pendiente'}
                    </Badge>
                );
            },
        }),
        columnHelper.display({
            id: 'accion',
            header: 'Acción',
            cell: info => {
                const h = info.row.original;
                return (
                    <Link to={`/projects/${id}/stories/${h.id}`} className="btn btn-outline-primary btn-sm">
                        <i className="ri-eye-line align-middle me-1"></i> Ver HU
                    </Link>
                );
            },
        }),
    ], [project, id]);

    const table = useReactTable({
        data: sprintStories,
        columns,
        state: {
            sorting,
            globalFilter,
            pagination,
        },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        globalFilterFn: (row, columnId, filterValue) => {
            const search = filterValue.toLowerCase();
            const titulo = (row.getValue('titulo') as string || '').toLowerCase();
            const status = (row.getValue('status') as string || '').toLowerCase();
            const statusLabels: Record<string, string> = {
                completed: 'completada',
                done: 'completada',
                in_progress: 'en progreso',
                pending: 'pendiente',
            };
            return titulo.includes(search) || (statusLabels[status] || status).includes(search);
        },
    });

    const pageCount = table.getPageCount();
    const currentPage = pagination.pageIndex + 1;
    const totalRows = sprintStories.length;
    const startRow = pagination.pageIndex * pagination.pageSize + 1;
    const endRow = Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalRows);

    useEffect(() => {
        document.title = `${sprint ? sprint.nombre : 'Cargando Sprint...'} | Detalles de Sprint`;
    }, [sprint]);

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

                                    <hr className="my-0 mb-3 border-light-subtle" />

                                    <div className="d-flex align-items-center justify-content-between mb-3 pt-3 gap-3">
                                        <h5 className="card-title mb-0 fs-15">Historias de Usuario del Sprint</h5>
                                        <div className="d-flex align-items-center gap-3">
                                            <div className="position-relative" style={{ maxWidth: '250px', width: '100%' }}>
                                                <Input
                                                    type="text"
                                                    placeholder="Buscar historia..."
                                                    value={globalFilter}
                                                    onChange={(e) => {
                                                        setGlobalFilter(e.target.value);
                                                        setPagination(prev => ({ ...prev, pageIndex: 0 }));
                                                    }}
                                                    className="form-control pe-5"
                                                    style={{ borderRadius: '20px' }}
                                                />
                                                <i className="ri-search-line position-absolute top-50 translate-middle-y text-muted" style={{ right: '15px' }}></i>
                                            </div>
                                            <span className="text-muted fs-13 text-nowrap">{totalRows} historias</span>
                                        </div>
                                    </div>

                                    <div className="table-responsive table-card">
                                        <table className="table table-striped align-middle mb-0">
                                            <thead className="table-light text-muted">
                                                {table.getHeaderGroups().map(headerGroup => (
                                                    <tr key={headerGroup.id}>
                                                        {headerGroup.headers.map(header => (
                                                            <th
                                                                key={header.id}
                                                                onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                                                                style={{ cursor: header.column.getCanSort() ? 'pointer' : 'default' }}
                                                            >
                                                                <div className="d-flex align-items-center gap-1">
                                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                                    {header.column.getCanSort() && (
                                                                        <span className="text-muted fs-10">
                                                                            {{
                                                                                asc: ' ▴',
                                                                                desc: ' ▾',
                                                                            }[header.column.getIsSorted() as string] ?? ' ⇅'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </th>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </thead>
                                            <tbody>
                                                {table.getRowModel().rows.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={columns.length} className="text-center py-4 text-muted">
                                                            {globalFilter ? "No se encontraron historias que coincidan con la búsqueda." : "No hay historias asignadas a este sprint."}
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    table.getRowModel().rows.map(row => (
                                                        <tr key={row.id}>
                                                            {row.getVisibleCells().map(cell => (
                                                                <td key={cell.id}>
                                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination Footer - always consistent */}
                                    {totalRows > 0 && (
                                        <div className="d-flex align-items-center justify-content-between mt-3 pt-3 pb-0 flex-wrap gap-2">
                                            <div className="d-flex align-items-center gap-2">
                                                <span className="text-muted fs-13">
                                                    Mostrando {startRow}-{endRow} de {totalRows}
                                                </span>
                                                <Input
                                                    type="select"
                                                    bsSize="sm"
                                                    className="form-select-sm"
                                                    style={{ width: 'auto' }}
                                                    value={pagination.pageSize}
                                                    onChange={(e) => {
                                                        setPagination(prev => ({ ...prev, pageSize: Number(e.target.value), pageIndex: 0 }));
                                                    }}
                                                >
                                                    <option value={5}>5 por página</option>
                                                    <option value={10}>10 por página</option>
                                                    <option value={20}>20 por página</option>
                                                    <option value={50}>50 por página</option>
                                                </Input>
                                            </div>
                                            {totalRows > pagination.pageSize && (
                                                <div className="d-flex align-items-center gap-1">
                                                    <Button
                                                        type="button"
                                                        color="light"
                                                        size="sm"
                                                        onClick={() => table.firstPage()}
                                                        disabled={!table.getCanPreviousPage()}
                                                        className="p-1"
                                                        style={{ width: '32px', height: '32px' }}
                                                    >
                                                        <i className="ri-skip-left-line"></i>
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        color="light"
                                                        size="sm"
                                                        onClick={() => table.previousPage()}
                                                        disabled={!table.getCanPreviousPage()}
                                                        className="p-1"
                                                        style={{ width: '32px', height: '32px' }}
                                                    >
                                                        <i className="ri-arrow-left-s-line"></i>
                                                    </Button>
                                                    {Array.from({ length: Math.min(pageCount, 5) }, (_, i) => {
                                                        const startPage = Math.max(0, Math.min(currentPage - 3, pageCount - 5));
                                                        const pageNum = startPage + i;
                                                        if (pageNum >= pageCount) return null;
                                                        return (
                                                            <Button
                                                                key={pageNum}
                                                                type="button"
                                                                color={currentPage === pageNum + 1 ? 'primary' : 'light'}
                                                                size="sm"
                                                                onClick={() => table.setPageIndex(pageNum)}
                                                                className="p-1"
                                                                style={{ width: '32px', height: '32px', fontWeight: currentPage === pageNum + 1 ? 600 : 400 }}
                                                            >
                                                                {pageNum + 1}
                                                            </Button>
                                                        );
                                                    })}
                                                    <Button
                                                        type="button"
                                                        color="light"
                                                        size="sm"
                                                        onClick={() => table.nextPage()}
                                                        disabled={!table.getCanNextPage()}
                                                        className="p-1"
                                                        style={{ width: '32px', height: '32px' }}
                                                    >
                                                        <i className="ri-arrow-right-s-line"></i>
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        color="light"
                                                        size="sm"
                                                        onClick={() => table.lastPage()}
                                                        disabled={!table.getCanNextPage()}
                                                        className="p-1"
                                                        style={{ width: '32px', height: '32px' }}
                                                    >
                                                        <i className="ri-skip-right-line"></i>
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}
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

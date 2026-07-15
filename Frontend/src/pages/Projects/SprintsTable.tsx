import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
import { Table, Badge, Input, Button, Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';

interface Sprint {
    id: string;
    nombre: string;
    status: string;
    backlog?: string[];
}

interface Story {
    id: string;
    titulo: string;
    story_points: number;
    status: string;
}

interface SprintsTableProps {
    data: Sprint[];
    historias: Story[];
    projectId: string;
    onUpdateStatus: (id: string, status: string) => void;
    onDeleteStory: (storyId: string) => void;
    onDeleteSprint: (sprintId: string) => void;
    onRenameSprint: (sprintId: string, nombre: string) => void;
    getSprintStatusClass: (status: string) => string;
    draggedOverSprintId: string;
    setDraggedOverSprintId: (id: string) => void;
    handleDragOver: (e: React.DragEvent) => void;
    handleDrop: (e: React.DragEvent, sprintId: string) => void;
}

const columnHelper = createColumnHelper<Sprint>();

export const SprintsTable: React.FC<SprintsTableProps> = ({
    data,
    historias,
    projectId,
    onUpdateStatus,
    onDeleteStory,
    onDeleteSprint,
    onRenameSprint,
    getSprintStatusClass,
    draggedOverSprintId,
    setDraggedOverSprintId,
    handleDragOver,
    handleDrop
}) => {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState("");
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });
    const [expandedSprints, setExpandedSprints] = useState<Record<string, boolean>>({});
    const [openMenuStoryId, setOpenMenuStoryId] = useState<string | null>(null);
    const [openMenuSprintId, setOpenMenuSprintId] = useState<string | null>(null);
    const [editingSprintId, setEditingSprintId] = useState<string | null>(null);
    const [editingSprintName, setEditingSprintName] = useState<string>("");

    const toggleExpand = (sprintId: string) => {
        setExpandedSprints(prev => ({
            ...prev,
            [sprintId]: !prev[sprintId]
        }));
    };

    const columns = useMemo(() => [
        columnHelper.display({
            id: 'expandir',
            header: '',
            cell: info => {
                const sprintId = info.row.original.id;
                const isExpanded = !!expandedSprints[sprintId];
                return (
                    <Button 
                        color="link" 
                        size="sm" 
                        className="p-0 text-muted"
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(sprintId);
                        }}
                    >
                        <i className={`ri-arrow-${isExpanded ? 'up' : 'down'}-s-line fs-16`}></i>
                    </Button>
                );
            }
        }),
        columnHelper.accessor('nombre', {
            header: 'Sprint',
            cell: info => {
                const sprint = info.row.original;
                const isEditing = editingSprintId === sprint.id;
                if (isEditing) {
                    return (
                        <div className="d-flex align-items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Input
                                type="text"
                                bsSize="sm"
                                value={editingSprintName}
                                onChange={(e) => setEditingSprintName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') onRenameSprint(sprint.id, editingSprintName);
                                    if (e.key === 'Escape') { setEditingSprintId(null); setEditingSprintName(''); }
                                }}
                                autoFocus
                                style={{ maxWidth: '180px' }}
                            />
                            <Button size="sm" color="success" className="p-1" style={{ lineHeight: 1 }}
                                onClick={(e) => { e.stopPropagation(); onRenameSprint(sprint.id, editingSprintName); }}>
                                <i className="ri-check-line"></i>
                            </Button>
                            <Button size="sm" color="light" className="p-1" style={{ lineHeight: 1 }}
                                onClick={(e) => { e.stopPropagation(); setEditingSprintId(null); setEditingSprintName(''); }}>
                                <i className="ri-close-line"></i>
                            </Button>
                        </div>
                    );
                }
                return (
                    <Link
                        to={`/projects/${projectId}/sprints/${sprint.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-body"
                    >
                        <strong>{info.getValue()}</strong>
                    </Link>
                );
            }
        }),
        columnHelper.accessor('status', {
            header: 'Estado',
            cell: info => {
                const status = info.getValue();
                const sprintId = info.row.original.id;
                return (
                    <div onClick={(e) => e.stopPropagation()}>
                        <Input 
                            type="select" 
                            bsSize="sm" 
                            className={`form-select-sm fw-medium ${getSprintStatusClass(status)}`}
                            style={{ width: '110px', height: '28px', padding: '0.1rem 0.5rem', fontSize: '12px' }}
                            value={status} 
                            onChange={(e) => onUpdateStatus(sprintId, e.target.value)}
                        >
                            <option value="planned">Planificado</option>
                            <option value="active">Activo</option>
                            <option value="closed">Cerrado</option>
                        </Input>
                    </div>
                );
            }
        }),
        columnHelper.accessor('backlog', {
            header: 'Historias',
            cell: info => {
                const backlog = info.getValue() || [];
                return <Badge color="success" className="text-white px-2">{backlog.length} HU</Badge>;
            }
        }),
        columnHelper.display({
            id: 'acciones',
            header: '',
            cell: info => {
                const sprint = info.row.original;
                return (
                    <div onClick={(e) => e.stopPropagation()}>
                        <Dropdown
                            isOpen={openMenuSprintId === sprint.id}
                            toggle={(e: any) => {
                                e.stopPropagation();
                                setOpenMenuSprintId(prev => prev === sprint.id ? null : sprint.id);
                            }}
                        >
                            <DropdownToggle tag="button" className="btn btn-ghost-secondary btn-icon btn-sm p-0" style={{ width: '28px', height: '28px' }}>
                                <i className="ri-more-2-fill fs-16"></i>
                            </DropdownToggle>
                            <DropdownMenu strategy="fixed" end>
                                <DropdownItem tag={Link} to={`/projects/${projectId}/sprints/${sprint.id}`}>
                                    <i className="ri-eye-line align-bottom me-2 text-muted"></i> Ver Detalle
                                </DropdownItem>
                                <DropdownItem onClick={(e: any) => {
                                    e.stopPropagation();
                                    setOpenMenuSprintId(null);
                                    setEditingSprintId(sprint.id);
                                    setEditingSprintName(sprint.nombre);
                                }}>
                                    <i className="ri-pencil-line align-bottom me-2 text-muted"></i> Renombrar
                                </DropdownItem>
                                <DropdownItem divider />
                                <DropdownItem
                                    className="text-danger"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuSprintId(null);
                                        onDeleteSprint(sprint.id);
                                    }}
                                >
                                    <i className="ri-delete-bin-line align-bottom me-2"></i> Eliminar Sprint
                                </DropdownItem>
                            </DropdownMenu>
                        </Dropdown>
                    </div>
                );
            }
        })
    ], [expandedSprints, openMenuSprintId, onUpdateStatus, getSprintStatusClass]);

    const table = useReactTable({
        data,
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
            const nombre = (row.getValue('nombre') as string || '').toLowerCase();
            const status = (row.getValue('status') as string || '').toLowerCase();
            const statusLabels: Record<string, string> = {
                planned: 'planificado',
                active: 'activo',
                closed: 'cerrado',
            };
            return nombre.includes(search) || (statusLabels[status] || status).includes(search);
        },
    });

    const pageCount = table.getPageCount();
    const currentPage = pagination.pageIndex + 1;
    const totalRows = data.length;
    const startRow = pagination.pageIndex * pagination.pageSize + 1;
    const endRow = Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalRows);

    return (
        <div>
            {/* Search Bar */}
            <div className="d-flex align-items-center justify-content-between mb-3 gap-3">
                <div className="position-relative" style={{ maxWidth: '300px', width: '100%' }}>
                    <Input
                        type="text"
                        placeholder="Buscar sprint..."
                        value={globalFilter}
                        onChange={(e) => {
                            setGlobalFilter(e.target.value);
                            setPagination(prev => ({ ...prev, pageIndex: 0 }));
                            setExpandedSprints({});
                        }}
                        className="form-control pe-5"
                        style={{ borderRadius: '20px' }}
                    />
                    <i className="ri-search-line position-absolute top-50 translate-middle-y text-muted" style={{ right: '15px' }}></i>
                </div>
                <span className="text-muted fs-13">{totalRows} sprints</span>
            </div>

            <div className="table-responsive">
                <Table className="table-centered align-middle table-nowrap mb-0">
                    <thead className="table-light">
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
                                    {globalFilter ? "No se encontraron sprints que coincidan con la búsqueda." : "No hay sprints."}
                                </td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map(row => {
                                const sprint = row.original;
                                const isExpanded = !!expandedSprints[sprint.id];
                                const isDraggedOver = draggedOverSprintId === sprint.id;
                                const sprintStories = historias.filter(h => sprint.backlog?.includes(h.id));

                                return (
                                    <React.Fragment key={row.id}>
                                        <tr 
                                            className={`transition-all ${isDraggedOver ? 'table-primary bg-primary bg-opacity-20 shadow' : ''}`}
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, sprint.id)}
                                            onDragEnter={() => setDraggedOverSprintId(sprint.id)}
                                            onDragLeave={() => setDraggedOverSprintId("")}
                                            style={{ 
                                                cursor: 'pointer',
                                                border: isDraggedOver ? '2px solid var(--vz-primary)' : undefined
                                            }}
                                            onClick={() => toggleExpand(sprint.id)}
                                        >
                                            {row.getVisibleCells().map(cell => (
                                                <td key={cell.id}>
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </td>
                                            ))}
                                        </tr>
                                        {isExpanded && (
                                            <tr>
                                                <td colSpan={columns.length} className="bg-light p-3">
                                                    <div className="ps-4">
                                                        <h6 className="fs-11 text-muted text-uppercase mb-2">Historias en este Sprint:</h6>
                                                        {sprintStories.length === 0 ? (
                                                            <p className="text-muted fs-12 fst-italic mb-0">No hay historias asignadas a este sprint.</p>
                                                        ) : (
                                                            <div className="d-flex flex-column gap-1">
                                                                {sprintStories.map(story => {
                                                                    const sIndex = historias.findIndex(h => h.id === story.id);
                                                                    return (
                                                                        <div key={story.id} className="d-flex align-items-center justify-content-between p-2 bg-body-tertiary rounded border border-light-subtle">
                                                                            <Link to={`/projects/${projectId}/stories/${story.id}`} className="fs-12 text-truncate text-body text-decoration-none" style={{ maxWidth: '70%' }}>
                                                                                <span className="text-muted me-1">HU-{sIndex + 1}:</span>
                                                                                <strong>{story.titulo}</strong>
                                                                            </Link>
                                                                            <div className="d-flex align-items-center gap-2">
                                                                                <Badge color="info" className="px-2">{story.story_points} Puntos</Badge>
                                                                                <Dropdown
                                                                                    isOpen={openMenuStoryId === story.id}
                                                                                    toggle={(e: any) => {
                                                                                        e.stopPropagation();
                                                                                        setOpenMenuStoryId(prev => prev === story.id ? null : story.id);
                                                                                    }}
                                                                                >
                                                                                    <DropdownToggle tag="button" className="btn btn-ghost-secondary btn-icon btn-sm p-0" style={{ width: '24px', height: '24px' }}>
                                                                                        <i className="ri-more-2-fill fs-16"></i>
                                                                                    </DropdownToggle>
                                                                                    <DropdownMenu strategy="fixed" end>
                                                                                        <DropdownItem
                                                                                            className="text-danger"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                setOpenMenuStoryId(null);
                                                                                                onDeleteStory(story.id);
                                                                                            }}
                                                                                        >
                                                                                            <i className="ri-delete-bin-line me-2"></i>
                                                                                            Eliminar Historia
                                                                                        </DropdownItem>
                                                                                    </DropdownMenu>
                                                                                </Dropdown>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>
                </Table>
            </div>

            {/* Pagination */}
            {totalRows > pagination.pageSize && (
                <div className="d-flex align-items-center justify-content-between mt-3 flex-wrap gap-2">
                    <div className="d-flex align-items-center gap-2">
                        <span className="text-muted fs-13">
                            Mostrando {startRow}-{endRow} de {totalRows}
                        </span>
                        <select
                            className="form-select form-select-sm"
                            style={{ width: 'auto' }}
                            value={pagination.pageSize}
                            onChange={(e) => {
                                setPagination(prev => ({ ...prev, pageSize: Number(e.target.value), pageIndex: 0 }));
                                setExpandedSprints({});
                            }}
                        >
                            <option value={5}>5 por página</option>
                            <option value={10}>10 por página</option>
                            <option value={20}>20 por página</option>
                            <option value={50}>50 por página</option>
                        </select>
                    </div>
                    <div className="d-flex align-items-center gap-1">
                        <Button
                            type="button"
                            color="light"
                            size="sm"
                            onClick={() => { table.firstPage(); setExpandedSprints({}); }}
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
                            onClick={() => { table.previousPage(); setExpandedSprints({}); }}
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
                                    onClick={() => { table.setPageIndex(pageNum); setExpandedSprints({}); }}
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
                            onClick={() => { table.nextPage(); setExpandedSprints({}); }}
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
                            onClick={() => { table.lastPage(); setExpandedSprints({}); }}
                            disabled={!table.getCanNextPage()}
                            className="p-1"
                            style={{ width: '32px', height: '32px' }}
                        >
                            <i className="ri-skip-right-line"></i>
                        </Button>
                    </div>
                </div>
            )}
            {totalRows <= pagination.pageSize && totalRows > 0 && (
                <div className="d-flex justify-content-end mt-2">
                    <select
                        className="form-select form-select-sm"
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
                    </select>
                </div>
            )}
        </div>
    );
};

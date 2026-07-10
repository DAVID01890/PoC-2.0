import React, { useMemo, useState } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    flexRender,
    createColumnHelper,
    SortingState
} from '@tanstack/react-table';
import { Table, Badge, Input, UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { Link } from 'react-router-dom';

interface Story {
    id: string;
    titulo: string;
    story_points: number;
    status: string;
    descripcion?: string;
    asignado_a?: string | null;
    asignados?: string[];
}

interface StoriesTableProps {
    data: Story[];
    allStories: Story[]; // Todas las historias para calcular el índice real (HU-X)
    projectId: string;
    projectMiembros?: Record<string, string>;
    onUpdateStatus: (id: string, status: string) => void;
    onEdit: (story: Story) => void;
    onAssign: (storyId: string) => void;
    onDelete: (storyId: string) => void;
    getStoryStatusClass: (status: string) => string;
    handleDragStart: (e: React.DragEvent, id: string) => void;
    draggingStoryId?: string | null;
    handleDragEnd?: () => void;
}

const columnHelper = createColumnHelper<Story>();

export const StoriesTable: React.FC<StoriesTableProps> = ({
    data,
    allStories,
    projectId,
    projectMiembros,
    onUpdateStatus,
    onEdit,
    onAssign,
    onDelete,
    getStoryStatusClass,
    handleDragStart,
    draggingStoryId,
    handleDragEnd
}) => {
    const [sorting, setSorting] = useState<SortingState>([]);

    const columns = useMemo(() => [
        columnHelper.accessor('id', {
            header: 'ID',
            cell: info => {
                const storyId = info.getValue();
                const originalIndex = allStories.findIndex(x => x.id === storyId);
                return <span className="text-muted fw-semibold">HU-{originalIndex + 1}</span>;
            },
            enableSorting: false
        }),
        columnHelper.accessor('titulo', {
            header: 'Título',
            cell: info => {
                const story = info.row.original;
                return (
                    <Link to={`/projects/${projectId}/stories/${story.id}`} className="fw-semibold text-body text-decoration-none hover-text-primary">
                        {info.getValue()}
                    </Link>
                );
            }
        }),
        columnHelper.accessor('story_points', {
            header: 'Puntos',
            cell: info => {
                const story = info.row.original;
                const asignados = story.asignados || (story.asignado_a ? [story.asignado_a] : []);
                const getRoleBadgeColor = (r: string) => {
                    switch (r) {
                        case 'owner': return 'warning';
                        case 'scrum_master': return 'primary';
                        case 'product_owner': return 'danger';
                        default: return 'info';
                    }
                };
                return (
                    <div className="d-flex align-items-center flex-wrap gap-1">
                        <Badge color="info" className="px-2 py-1 fs-12">{info.getValue()} Puntos</Badge>
                        {asignados.map((uId: string) => {
                            const role = projectMiembros ? projectMiembros[uId] : null;
                            if (!role) return null;
                            return (
                                <Badge key={uId} color={getRoleBadgeColor(role)} className="text-uppercase text-white" style={{ fontSize: '10px' }}>
                                    {role.replace('_', ' ')}
                                </Badge>
                            );
                        })}
                    </div>
                );
            }
        }),
        columnHelper.accessor('status', {
            header: 'Estado',
            cell: info => {
                const status = info.getValue();
                const storyId = info.row.original.id;
                return (
                    <div onClick={(e) => e.stopPropagation()}>
                        <Input 
                            type="select" 
                            bsSize="sm" 
                            className={`form-select-sm fw-medium ${getStoryStatusClass(status)}`}
                            style={{ width: '120px', height: '28px', padding: '0.1rem 0.5rem', fontSize: '12px' }}
                            value={status} 
                            onChange={(e) => onUpdateStatus(storyId, e.target.value)}
                        >
                            <option value="pending">Pendiente</option>
                            <option value="in_progress">En Progreso</option>
                            <option value="done">Completada</option>
                        </Input>
                    </div>
                );
            }
        }),
        columnHelper.display({
            id: 'acciones',
            header: 'Acciones',
            cell: info => {
                const story = info.row.original;
                return (
                    <div onClick={(e) => e.stopPropagation()}>
                        <UncontrolledDropdown>
                            <DropdownToggle tag="button" className="btn btn-link text-muted p-1">
                                <i className="ri-more-2-fill fs-16"></i>
                            </DropdownToggle>
                            <DropdownMenu strategy="fixed" className="dropdown-menu-end">
                                <DropdownItem tag={Link} to={`/projects/${projectId}/stories/${story.id}`}>
                                    <i className="ri-eye-line align-bottom me-2 text-muted"></i> Ver Detalle
                                </DropdownItem>
                                <DropdownItem onClick={() => onEdit(story)}>
                                    <i className="ri-pencil-line align-bottom me-2 text-muted"></i> Editar
                                </DropdownItem>
                                <DropdownItem onClick={() => onAssign(story.id)}>
                                    <i className="ri-send-plane-line align-bottom me-2 text-muted"></i> Asignar a Sprint
                                </DropdownItem>
                                <DropdownItem divider />
                                <DropdownItem className="text-danger" onClick={() => onDelete(story.id)}>
                                    <i className="ri-delete-bin-5-line align-bottom me-2 text-danger"></i> Eliminar
                                </DropdownItem>
                            </DropdownMenu>
                        </UncontrolledDropdown>
                    </div>
                );
            }
        })
    ], [allStories, projectId, onUpdateStatus, onEdit, onAssign, onDelete, getStoryStatusClass]);

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
        },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    return (
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
                    {table.getRowModel().rows.map(row => (
                        <tr 
                            key={row.id}
                            draggable="true"
                            onDragStart={(e) => handleDragStart(e, row.original.id)}
                            onDragEnd={handleDragEnd}
                            className="cursor-grab transition-all"
                            style={{
                                opacity: draggingStoryId === row.original.id ? 0.2 : 1,
                                border: draggingStoryId === row.original.id ? '2px dashed var(--vz-border-color)' : undefined
                            }}
                        >
                            {row.getVisibleCells().map(cell => (
                                <td key={cell.id}>
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </Table>
        </div>
    );
};

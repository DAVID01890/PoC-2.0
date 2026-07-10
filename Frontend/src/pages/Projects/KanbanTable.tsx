import React, { useMemo, useState } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    flexRender,
    createColumnHelper,
    SortingState
} from '@tanstack/react-table';
import { Table, Badge, Input, Button, UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { Link } from 'react-router-dom';

interface Task {
    id: string;
    historia_id: string;
    titulo: string;
    estimated_hours: number;
    status: string;
    descripcion?: string;
}

interface Story {
    id: string;
    titulo: string;
    story_points: number;
    status: string;
    descripcion?: string;
}

interface KanbanTableProps {
    data: Story[];
    allStories: Story[];
    tasks: Task[];
    projectId: string;
    onUpdateStoryStatus: (id: string, status: string) => void;
    onStartTask: (id: string) => void;
    onCompleteTask: (id: string) => void;
    onEditTask: (task: Task) => void;
    onAddTask: (storyId: string) => void;
    getStoryStatusClass: (status: string) => string;
}

const columnHelper = createColumnHelper<Story>();

export const KanbanTable: React.FC<KanbanTableProps> = ({
    data,
    allStories,
    tasks,
    projectId,
    onUpdateStoryStatus,
    onStartTask,
    onCompleteTask,
    onEditTask,
    onAddTask,
    getStoryStatusClass
}) => {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [expandedStories, setExpandedStories] = useState<Record<string, boolean>>({});

    const toggleExpand = (storyId: string) => {
        setExpandedStories(prev => ({
            ...prev,
            [storyId]: !prev[storyId]
        }));
    };

    const columns = useMemo(() => [
        columnHelper.display({
            id: 'expandir',
            header: '',
            cell: info => {
                const storyId = info.row.original.id;
                const isExpanded = !!expandedStories[storyId];
                return (
                    <Button 
                        color="link" 
                        size="sm" 
                        className="p-0 text-muted"
                        onClick={() => toggleExpand(storyId)}
                    >
                        <i className={`ri-arrow-${isExpanded ? 'up' : 'down'}-s-line fs-16`}></i>
                    </Button>
                );
            }
        }),
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
            header: 'Historia de Usuario',
            cell: info => {
                const story = info.row.original;
                return (
                    <Link 
                        to={`/projects/${projectId}/stories/${story.id}`} 
                        className="fw-bold text-body text-decoration-none hover-text-primary"
                        onClick={(e) => e.stopPropagation()} // Evita que se dispare el colapso/expansión de la fila al hacer clic en el enlace
                    >
                        {info.getValue()}
                    </Link>
                );
            }
        }),
        columnHelper.accessor('story_points', {
            header: 'Puntos',
            cell: info => <Badge color="info" className="px-2">{info.getValue()} Puntos</Badge>
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
                            onChange={(e) => onUpdateStoryStatus(storyId, e.target.value)}
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
            id: 'tareas_count',
            header: 'Tareas Técnicas',
            cell: info => {
                const storyId = info.row.original.id;
                const storyTasks = tasks.filter(t => t.historia_id === storyId);
                return <Badge color="secondary" className="px-2">{storyTasks.length} Tareas</Badge>;
            }
        }),
        columnHelper.display({
            id: 'acciones',
            header: 'Acciones',
            cell: info => {
                const storyId = info.row.original.id;
                return (
                    <div onClick={(e) => e.stopPropagation()}>
                        <Button 
                            color="success" 
                            size="sm" 
                            className="btn-sm py-1 px-2"
                            onClick={() => onAddTask(storyId)}
                        >
                            <i className="ri-add-line align-middle me-1"></i> Tarea
                        </Button>
                    </div>
                );
            }
        })
    ], [expandedStories, allStories, tasks, onUpdateStoryStatus, onAddTask, getStoryStatusClass]);

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
                    {table.getRowModel().rows.map(row => {
                        const story = row.original;
                        const isExpanded = !!expandedStories[story.id];
                        const storyTasks = tasks.filter(t => t.historia_id === story.id);

                        return (
                            <React.Fragment key={row.id}>
                                <tr onClick={() => toggleExpand(story.id)} style={{ cursor: 'pointer' }}>
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                                {isExpanded && (
                                    <tr>
                                        <td colSpan={columns.length} className="bg-light-subtle p-3">
                                            <div className="ps-4">
                                                <h6 className="fs-12 text-muted text-uppercase mb-2">Tareas Técnicas asociadas:</h6>
                                                {storyTasks.length === 0 ? (
                                                    <p className="text-muted fs-12 fst-italic mb-0">No hay tareas técnicas creadas para esta historia de usuario.</p>
                                                ) : (
                                                    <Table className="table table-bordered mb-0 table-sm">
                                                        <thead className="table-light">
                                                            <tr>
                                                                <th>Tarea</th>
                                                                <th>Estado</th>
                                                                <th>Acciones</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {storyTasks.map(task => {
                                                                const originalIndex = tasks.findIndex(t => t.id === task.id);
                                                                const taskCode = originalIndex !== -1 ? `T-${originalIndex + 1}` : "";
                                                                return (
                                                                    <tr key={task.id}>
                                                                        <td>
                                                                            <strong className="text-body">
                                                                                {taskCode && <span className="text-muted me-1">{taskCode}:</span>}
                                                                                {task.titulo}
                                                                            </strong>
                                                                            {task.descripcion && <p className="text-muted fs-11 mb-0">{task.descripcion}</p>}
                                                                        </td>
                                                                    <td>
                                                                        <Badge color={
                                                                            task.status === 'done' ? 'success' :
                                                                            task.status === 'in_progress' ? 'warning' : 'secondary'
                                                                        }>
                                                                            {
                                                                                task.status === 'done' ? 'Completada' :
                                                                                task.status === 'in_progress' ? 'En Progreso' : 'Pendiente'
                                                                            }
                                                                        </Badge>
                                                                    </td>
                                                                    <td>
                                                                        <div className="d-flex gap-1">
                                                                            {task.status === 'pending' && (
                                                                                <Button color="warning" size="sm" className="btn-sm py-0 px-2 fs-11" onClick={() => onStartTask(task.id)}>
                                                                                    Iniciar
                                                                                </Button>
                                                                            )}
                                                                            {task.status === 'in_progress' && (
                                                                                <Button color="success" size="sm" className="btn-sm py-0 px-2 fs-11" onClick={() => onCompleteTask(task.id)}>
                                                                                    Completar
                                                                                </Button>
                                                                            )}
                                                                            <Button color="light" size="sm" className="btn-sm py-0 px-2 fs-11 text-muted border" onClick={() => onEditTask(task)}>
                                                                                Editar
                                                                            </Button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </Table>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </Table>
        </div>
    );
};

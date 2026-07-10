CREATE_PROYECTOS_TABLE = """
CREATE TABLE IF NOT EXISTS proyectos (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT
);
"""

CREATE_SPRINTS_TABLE = """
CREATE TABLE IF NOT EXISTS sprints (
    id TEXT PRIMARY KEY,
    proyecto_id TEXT NOT NULL REFERENCES proyectos(id),
    nombre TEXT NOT NULL,
    fecha_inicio TEXT,
    fecha_fin TEXT,
    status TEXT NOT NULL DEFAULT 'planned'
);
"""

CREATE_HISTORIAS_TABLE = """
CREATE TABLE IF NOT EXISTS historias (
    id TEXT PRIMARY KEY,
    proyecto_id TEXT NOT NULL REFERENCES proyectos(id),
    sprint_id TEXT REFERENCES sprints(id),
    titulo TEXT NOT NULL,
    descripcion TEXT,
    story_points INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    asignado_a TEXT
);
"""

CREATE_TAREAS_TECNICAS_TABLE = """
CREATE TABLE IF NOT EXISTS tareas_tecnicas (
    id TEXT PRIMARY KEY,
    historia_id TEXT NOT NULL REFERENCES historias(id),
    titulo TEXT NOT NULL,
    descripcion TEXT,
    estimated_hours INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
);
"""

CREATE_PROYECTO_MIEMBROS_TABLE = """
CREATE TABLE IF NOT EXISTS proyecto_miembros (
    proyecto_id TEXT NOT NULL REFERENCES proyectos(id),
    usuario_id TEXT NOT NULL REFERENCES usuarios(id),
    rol TEXT NOT NULL,
    PRIMARY KEY (proyecto_id, usuario_id)
);
"""

CREATE_OUTBOX_EVENTS_TABLE = """
CREATE TABLE IF NOT EXISTS outbox_events (
    id TEXT PRIMARY KEY,
    aggregate_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    created_at TEXT,
    processed_at TEXT,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT
);
"""

# Índices sobre columnas de clave foránea para evitar full-table-scans
CREATE_INDEXES = """
CREATE INDEX IF NOT EXISTS idx_sprints_proyecto_id ON sprints(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_historias_proyecto_id ON historias(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_historias_sprint_id ON historias(sprint_id);
CREATE INDEX IF NOT EXISTS idx_tareas_historia_id ON tareas_tecnicas(historia_id);
CREATE INDEX IF NOT EXISTS idx_miembros_proyecto_id ON proyecto_miembros(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_outbox_processed_at ON outbox_events(processed_at);
"""

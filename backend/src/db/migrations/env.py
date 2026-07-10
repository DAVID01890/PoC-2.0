from logging.config import fileConfig

from sqlalchemy import (
    Column,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    engine_from_config,
    pool,
)

from alembic import context

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = MetaData()

Table(
    "proyectos",
    target_metadata,
    Column("id", String, primary_key=True),
    Column("nombre", String, nullable=False),
)

Table(
    "sprints",
    target_metadata,
    Column("id", String, primary_key=True),
    Column("proyecto_id", String, nullable=False),
    Column("nombre", String, nullable=False),
    Column("fecha_inicio", String),
    Column("fecha_fin", String),
    Column("status", String, nullable=False),
)

Table(
    "historias",
    target_metadata,
    Column("id", String, primary_key=True),
    Column("proyecto_id", String, nullable=False),
    Column("sprint_id", String),
    Column("titulo", String, nullable=False),
    Column("descripcion", Text),
    Column("story_points", Integer, nullable=False),
    Column("status", String, nullable=False),
)

Table(
    "tareas_tecnicas",
    target_metadata,
    Column("id", String, primary_key=True),
    Column("historia_id", String, nullable=False),
    Column("titulo", String, nullable=False),
    Column("descripcion", Text),
    Column("estimated_hours", Integer, nullable=False),
    Column("status", String, nullable=False),
)

Table(
    "usuarios",
    target_metadata,
    Column("id", String, primary_key=True),
    Column("email", String, nullable=False, unique=True),
    Column("name", String, nullable=False),
    Column("role", String, nullable=False),
    Column("is_active", Integer, nullable=False),
)


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

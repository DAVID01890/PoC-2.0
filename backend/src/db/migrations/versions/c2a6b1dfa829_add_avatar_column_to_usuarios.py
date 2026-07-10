"""add avatar column to usuarios

Revision ID: c2a6b1dfa829
Revises: 568d96a603d4
Create Date: 2026-06-29 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c2a6b1dfa829'
down_revision: Union[str, Sequence[str], None] = '568d96a603d4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('usuarios', sa.Column('avatar', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('usuarios', 'avatar')

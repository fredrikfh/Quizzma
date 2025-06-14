"""Tie topics to summary and sentiment to answers

Revision ID: 1090f5fdff68
Revises: c20474f7440c
Create Date: 2025-03-26 23:03:25.554843

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision: str = '1090f5fdff68'
down_revision: Union[str, None] = 'c20474f7440c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('sentimentanalysis', schema=None) as batch_op:
        batch_op.create_unique_constraint(None, ['answer_id'])

    with op.batch_alter_table('summary', schema=None) as batch_op:
        batch_op.add_column(sa.Column('topic_id', sa.Uuid(), nullable=True))
        batch_op.create_foreign_key(None, 'topic', ['topic_id'], ['id'], ondelete='CASCADE')

    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('summary', schema=None) as batch_op:
        batch_op.drop_constraint(None, type_='foreignkey')
        batch_op.drop_column('topic_id')

    with op.batch_alter_table('sentimentanalysis', schema=None) as batch_op:
        batch_op.drop_constraint(None, type_='unique')

    # ### end Alembic commands ###

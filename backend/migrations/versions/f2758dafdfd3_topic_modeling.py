"""topic-modeling

Revision ID: f2758dafdfd3
Revises: 53b12b24e09d
Create Date: 2025-02-17 21:46:53.132964

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision: str = 'f2758dafdfd3'
down_revision: Union[str, None] = '53b12b24e09d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the "topic" table with an id, a question_id (FK to question.id),
    # and a topic field.
    op.create_table(
        'topic',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('question_id', sa.Uuid(), nullable=False),
        sa.Column('topic', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.ForeignKeyConstraint(['question_id'], ['question.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create the "answer_topic" join table with composite primary key,
    # linking answer_id (FK to answer.id) and topic_id (FK to topic.id)
    op.create_table(
        'answer_topic',
        sa.Column('answer_id', sa.Uuid(), nullable=False),
        sa.Column('topic_id', sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(['answer_id'], ['answer.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['topic_id'], ['topic.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('answer_id', 'topic_id')
    )


def downgrade() -> None:
    # Drop the join table first since it depends on "topic"
    op.drop_table('answer_topic')
    # Then drop the "topic" table
    op.drop_table('topic')

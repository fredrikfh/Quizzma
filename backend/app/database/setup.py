import logging
import os
import sys
from typing import Annotated, Optional
import uuid
from dotenv import load_dotenv
from pydantic import AfterValidator
from sqlalchemy import Engine, Text
from sqlmodel import Field, Relationship, create_engine, SQLModel, text, Session
from sqlalchemy.orm import sessionmaker

logger = logging.getLogger("app")

load_dotenv()

# region Validators


def disallow_blank(v: str) -> str:
    if v.strip() == "":
        raise ValueError("Field cannot be blank")
    return v


# endregion


# Association table for Answer and Topic many-to-many relationship.
class AnswerTopicAssociation(SQLModel, table=True):
    answer_id: uuid.UUID = Field(foreign_key="answer.id", primary_key=True)
    topic_id: uuid.UUID = Field(foreign_key="topic.id", primary_key=True)

# region Quiz model

class QuizBase(SQLModel):
    name: Annotated[str, Field(index=True), AfterValidator(disallow_blank)]
    description: str | None = Field(default=None)


class Quiz(QuizBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: str = Field(min_length=28, max_length=28)  # Firebase
    questions: list["Question"] = Relationship(
        back_populates="quiz",
        cascade_delete=True,
    )


class QuizCreate(QuizBase):
    pass


class QuizPublic(QuizBase):
    id: uuid.UUID
    user_id: str
    questions: list["QuestionPublic"] = []


class QuizPublicExtended(QuizPublic):
    questions: list["QuestionPublicExtended"] = []


# endregion


# region Question model

class QuestionBase(SQLModel):
    quiz_id: uuid.UUID = Field(foreign_key="quiz.id", ondelete="CASCADE")
    text: str = Field(sa_type=Text)


class Question(QuestionBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    predefined: bool = False
    quiz: Quiz = Relationship(back_populates="questions")
    answers: list["Answer"] = Relationship(
        back_populates="question",
        cascade_delete=True,
    )
    summaries: list["Summary"] = Relationship(
        back_populates="question",
        cascade_delete=True,
    )
    topics: list["Topic"] = Relationship(back_populates="question", cascade_delete=True)


class QuestionCreate(QuestionBase):
    pass


class QuestionPublic(QuestionBase):
    id: uuid.UUID
    predefined: bool


class QuestionPublicExtended(QuestionPublic):
    answers: list["AnswerPublic"] = []
    summaries: list["SummaryPublic"] = []

# endregion


# region Answer model

class AnswerBase(SQLModel):
    question_id: uuid.UUID = Field(foreign_key="question.id", ondelete="CASCADE")
    text: str = Field(sa_type=Text)


class Answer(AnswerBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    question: Question = Relationship(back_populates="answers")
    topics: list["Topic"] = Relationship(
        back_populates="answers",
        link_model=AnswerTopicAssociation,
    )
    sentiment: Optional["SentimentAnalysis"] = Relationship(
        back_populates="answer",
        cascade_delete=True,
    )


class AnswerCreate(AnswerBase):
    pass


class AnswerPublic(AnswerBase):
    id: uuid.UUID


class AnswerPublicExtended(AnswerPublic):
    sentiment: Optional["SentimentAnalysisPublic"] = None


# endregion

# region Sentiment analysis model


class SentimentAnalysisBase(SQLModel):
    answer_id: uuid.UUID = Field(
        foreign_key="answer.id",
        unique=True,
        ondelete="CASCADE",
    )
    algorithm: str
    verdict: str
    compound: float
    positive: float
    neutral: float
    negative: float
    score: int = Field(default=100)


class SentimentAnalysis(SentimentAnalysisBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    answer: Answer = Relationship(back_populates="sentiment")


class SentimentAnalysisCreate(SentimentAnalysisBase):
    pass


class SentimentAnalysisPublic(SentimentAnalysisBase):
    id: uuid.UUID


# endregion

# region Summary model

class SummaryBase(SQLModel):
    question_id: uuid.UUID = Field(foreign_key="question.id", ondelete="CASCADE")
    topic_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="topic.id",
        ondelete="CASCADE",
    )
    summary_text: str = Field(sa_type=Text)
    emoji: str | None = Field(default=None)
    score: int = Field(default=100)
    algorithm: str


class Summary(SummaryBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    question: Question = Relationship(back_populates="summaries")
    topic: Optional["Topic"] = Relationship(back_populates="summary")


class SummaryCreate(SummaryBase):
    pass


class SummaryPublic(SummaryBase):
    id: uuid.UUID


# endregion
# region Topic model


class TopicBase(SQLModel):
    algorithm: str
    question_id: uuid.UUID = Field(foreign_key="question.id", ondelete="CASCADE")
    label: str
    topic: str = Field(sa_type=Text)
    score: int = Field(default=100)


class Topic(TopicBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    # Each topic is linked to a question.
    question: "Question" = Relationship(back_populates="topics")
    # Many-to-many: a topic can be associated with many answers.
    answers: list["Answer"] = Relationship(
        back_populates="topics",
        link_model=AnswerTopicAssociation,
    )
    summary: Summary | None = Relationship(back_populates="topic")


class TopicCreate(TopicBase):
    pass


class TopicPublic(TopicBase):
    id: uuid.UUID
    answers: list[Answer]


class TopicExtended(TopicBase):
    id: uuid.UUID
    summary: Summary | None
    answers: list[AnswerPublicExtended]


# endregion


NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

metadata = SQLModel.metadata
metadata.naming_convention = NAMING_CONVENTION

if not os.getenv("DATABASE_URL"):
    logger.error("Error: DATABASE_URL environment variable is not set.")
    sys.exit(1)
database_url = os.getenv("DATABASE_URL")
echo = True if os.getenv("DEBUG", False) == "true" else False

# Avoid sharing database sessions between requests
connect_args = {"check_same_thread": False}
engine = create_engine(
    database_url,
    echo=echo,
    pool_size=10,           # max number of open connections
    max_overflow=0,         # if all 10 are in use, new requests must wait
    pool_timeout=30,        # seconds to wait before giving up
    pool_recycle=1800,      # recycle connections every 30 minutes
    connect_args=connect_args,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=Session,
)


def get_db_engine() -> Engine:
    return engine


def configure_db() -> None:
    with engine.connect() as conn:
        # For SQLite only: Allow foreign key restrictions
        conn.execute(text("PRAGMA foreign_keys=ON"))

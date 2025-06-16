from enum import Enum
import uuid
from pydantic import BaseModel


class Answer(BaseModel):
    id: uuid.UUID
    text: str


class AnalysisRequest(BaseModel):
    question: str
    answers: list[str]
    quiz_name: str
    quiz_description: str | None = None
    audience_count: int | None = None
    topic_label: str | None = None


class Verdict(str, Enum):
    Positive = "Positive"
    Neutral = "Neutral"
    Negative = "Negative"


class SentimentAnalysisResult(BaseModel):
    algorithm: str
    answer: Answer
    verdict: str
    compound: float
    positive: float
    neutral: float
    negative: float


class SummaryResult(BaseModel):
    algorithm: str
    summary_text: str
    emoji: str | None = None


class TopicModellingResult(BaseModel):
    id: uuid.UUID
    algorithm: str
    question_id: uuid.UUID
    label: str
    topic: str  # e.g. a comma-separated list of top words
    answers: list[Answer] = []
    score: int = 100

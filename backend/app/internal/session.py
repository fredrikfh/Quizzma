import asyncio
from enum import Enum
import logging
import time
from typing import Iterable
import uuid

from fastapi import WebSocket
from pydantic import BaseModel
from app.database.setup import Answer, Question, QuestionPublic, SessionLocal
from app.internal.analysis import perform_sentiment_analysis
from processing.definitions import Answer as AnalysisAnswer
from processing.preprocessing import preprocessing

logger = logging.getLogger("app")


class SessionStage(str, Enum):
    """Stages for coordinating host and audience clients"""

    JoinSession = "join_session"
    AskQuestion = "ask_question"
    AwaitAnswers = "await_answers"
    ShowAnalyses = "show_analyses"


class SessionCreate(BaseModel):
    quiz_id: uuid.UUID | None = None


class SessionPublic(BaseModel):
    id: str
    owner_id: str
    quiz_id: uuid.UUID
    stage: SessionStage
    audience_count: int
    current_question: QuestionPublic | None = None
    current_answers: list[Answer] = []


class Session:
    id: str
    owner_id: str
    quiz_id: uuid.UUID
    stage: SessionStage
    current_question: Question | None
    current_answers: list[Answer]

    connections: list[WebSocket]

    batch_interval: float = 20.0
    answer_batch: list[Answer]
    prepared_answers: list[AnalysisAnswer]

    batch_lock: asyncio.Lock
    cancel_worker_task: bool
    worker_task: asyncio.Task | None
    sleep_task: asyncio.Task | None
    sentiment_tasks: set[asyncio.Task]

    def __init__(self, id: str, owner_id: str, quiz_id: uuid.UUID) -> None:
        self.id = id
        self.owner_id = owner_id
        self.quiz_id = quiz_id
        self.stage = SessionStage.JoinSession
        self.current_question = None
        self.current_answers = []

        self.connections = []

        self.answer_batch = []
        self.prepared_answers = []
        self.batch_lock = asyncio.Lock()
        self.cancel_worker_task = False
        self.worker_task = None
        self.sleep_task = None
        self.sentiment_tasks = set()

    def register_connection(self, connection: WebSocket) -> None:
        """
        Registers a new WebSocket connection in the session.

        Args:
            connection (WebSocket): The WebSocket connection to register.
        """
        self.connections.append(connection)

    def remove_connection(self, connection: WebSocket) -> None:
        """
        Removes a given WebSocket from the session.

        Args:
            connection (WebSocket): The WebSocket connection to remove.
        """
        self.connections.remove(connection)

    def register_answer(self, answer: Answer) -> None:
        """
        Registers an answer to the current session and includes it in
        the next batch for preparation.

        Args:
            answer (Answer): The answer to register.
        """
        self.current_answers.append(answer)
        self.answer_batch.append(answer)

    def audience_count(self) -> int:
        """
        Returns the number of active connections.

        Returns:
            int: The count of active connections.
        """
        return len(self.connections)

    def get_public(self) -> SessionPublic:
        """
        Retrieves a pydantic model object of the session to be returned in a response.

        Returns:
            SessionPublic: A pydantic model object containing public session details.
        """
        return SessionPublic(
            id=self.id,
            owner_id=self.owner_id,
            quiz_id=self.quiz_id,
            stage=self.stage,
            audience_count=self.audience_count(),
            current_question=self.current_question,
            current_answers=self.current_answers,
        )

    async def shut_down(self) -> None:
        """Shuts down the session by canceling the worker task and closing all connections."""
        if self.worker_task:
            self.worker_task.cancel()

        while len(self.connections) > 0:
            connection = self.connections.pop()
            await connection.close(code=1000, reason="Session killed by owner")

    async def _handle_sentiment(
        self,
        prepared_answers: Iterable[AnalysisAnswer],
    ) -> None:
        """
        Perform sentiment analysis on a batch of prepared answers and store in database.

        Args:
            prepared_answers (Iterable[AnalysisAnswer]): List of preprocessed answers
        """
        try:
            with SessionLocal() as db:
                await perform_sentiment_analysis(
                    db=db,
                    prepared_answers=prepared_answers,
                )
        except Exception as e:
            logger.debug(
                "Sentiment analysis failed for answer batch",
                exc_info=e,
            )

    async def _handle_batch(self) -> None:
        """
        Prepares a batch of answers by passing them to preprocessing functions
        in the processing module. If a batch fails, the original answers are
        used as a fallback.
        """
        async with self.batch_lock:
            start_time = time.monotonic()

            answers: list[Answer] = [answer for answer in self.answer_batch]
            batch_size = len(answers)
            if batch_size == 0:
                return

            prepared_answers: list[AnalysisAnswer] = []
            try:
                documents = [answer.text for answer in answers]
                documents = await preprocessing.correct_and_translate(
                    documents=documents,
                )

                if len(documents) == batch_size:
                    prepared_answers = [
                        AnalysisAnswer(id=answer.id, text=document)
                        for answer, document in zip(answers, documents)
                    ]
                else:
                    logger.debug(
                        "Answer batch was corrupted during correction and translation",
                    )
            except Exception as e:
                logger.debug(
                    "Answer batch failed during correction and translation",
                    exc_info=e,
                )

            if not prepared_answers:
                prepared_answers = [
                    AnalysisAnswer(id=answer.id, text=answer.text) for answer in answers
                ]

            self.prepared_answers.extend(prepared_answers)
            self.answer_batch = self.answer_batch[batch_size:]

            # Run sentiment analysis as a background task
            self.sentiment_tasks.add(
                asyncio.create_task(
                    self._handle_sentiment(prepared_answers=prepared_answers)
                )
            )
            logger.debug(
                f"Batch of {batch_size} answers processed in {time.monotonic() - start_time}s"
            )

    async def _run_worker_task(self) -> None:
        """
        Worker task that prepares a batch of answers at regular intervals
        The purpose of the task is to avoid preparing all responses at the
        same time right before the analyses should be rendered on screen.
        """
        logger.debug(f"Worker task for session {self.id} started")

        self.answer_batch = []
        self.prepared_answers = []
        self.sentiment_tasks = set()

        try:
            while not self.cancel_worker_task:
                self.sleep_task = asyncio.create_task(
                    asyncio.sleep(self.batch_interval)
                )
                await self.sleep_task
                await self._handle_batch()
        except asyncio.CancelledError:
            pass

        logger.debug(f"Worker task for session {self.id} stopped")

    async def start_worker(self) -> None:
        """Starts the worker task in the background"""
        self.cancel_worker_task = False
        self.worker_task = asyncio.create_task(self._run_worker_task())

    async def stop_worker(self) -> None:
        """Waits for any ongoing batch to finish, then cancels the worker task"""
        self.cancel_worker_task = True
        if self.sleep_task:
            self.sleep_task.cancel()

    async def get_prepared_answers(self) -> Iterable[AnalysisAnswer]:
        """
        Prepares any remaining answers before returning them all

        Returns:
            Iterable[AnalysisAnswer]: The prepared answers.
        """
        if len(self.answer_batch) > 0:
            await self._handle_batch()
        return self.prepared_answers

    async def await_sentiments(self) -> None:
        """Await any running sentiment analysis tasks"""
        await asyncio.gather(*self.sentiment_tasks)
        self.sentiment_tasks.clear()

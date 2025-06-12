import asyncio
import logging
import time
from typing import Annotated, Iterable, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import select, SQLModel
from sqlmodel import Session as DatabaseSession
from typing import cast

from app.database.setup import (
    Answer,
    AnswerPublicExtended,
    Question,
    QuestionCreate,
    QuestionPublic,
    Quiz,
    QuizCreate,
    QuizPublic,
    QuizPublicExtended,
    SentimentAnalysis,
    SentimentAnalysisPublic,
    Summary,
    SummaryPublic,
    Topic,
    TopicExtended,
    TopicPublic,
)
from app.dependencies import authenticate, get_db_session
from app.internal.analysis import (
    perform_import_formatting,
    perform_sentiment_analysis,
    perform_summarisation,
    perform_topic_modelling,
    perform_topic_summarisation,
)
from processing.definitions import Answer as AnalysisAnswer
from processing.preprocessing import preprocessing

router = APIRouter()

logger = logging.getLogger("app")


class ResponseBase(BaseModel):
    message: str


# A list of user IDs that are considered admins. (Will get READ access to all quizzes)
ADMIN_USER_IDS: list[str] = [
    "dH6cdCXscCRRI6gYKnrWvGyKFy82",
    "Wjz9leT9SSb8f1gChU76Vy4xYik2",
    "TqI4VLSqHAhXAxfQDOSMbNfPuBA2"
]

def is_admin(user_id: str) -> bool:
    """Return True if the given user_id belongs to an admin."""
    return user_id in ADMIN_USER_IDS

# region Quizzes


@router.get("/quizzes/{quiz_id}", operation_id="get_quiz")
async def get_quiz(
    quiz_id: uuid.UUID,
    db: Annotated[DatabaseSession, Depends(get_db_session)],
    user_id: Annotated[str, Depends(authenticate)],
) -> QuizPublicExtended:
    """Fetch a single quiz by its id with related questions and ratings"""
    quiz = db.get(Quiz, quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if quiz.user_id != user_id and not is_admin(user_id):
        raise HTTPException(status_code=403, detail="Access denied")
    return quiz


@router.get("/quizzes", operation_id="get_all_quizzes")
async def get_quizzes(
    db: Annotated[DatabaseSession, Depends(get_db_session)],
    user_id: Annotated[str, Depends(authenticate)],
) -> list[QuizPublic]:
    if is_admin(user_id):
        statement = select(Quiz)
    else:
        statement = select(Quiz).where(Quiz.user_id == user_id)
    quizzes = db.exec(statement)
    quizzes = quizzes.all()
    return quizzes


@router.post("/quizzes", operation_id="create_quiz")
async def create_quiz(
    quiz: QuizCreate,
    db: Annotated[DatabaseSession, Depends(get_db_session)],
    user_id: Annotated[str, Depends(authenticate)],
) -> QuizPublic:
    db_quiz = Quiz.model_validate(quiz, update={"user_id": user_id})
    db.add(db_quiz)
    db.commit()
    db.refresh(db_quiz)
    return db_quiz


@router.delete("/quizzes/{quiz_id}", operation_id="delete_quiz")
async def delete_quiz(
    quiz_id: uuid.UUID,
    db: Annotated[DatabaseSession, Depends(get_db_session)],
    user_id: Annotated[str, Depends(authenticate)],
) -> ResponseBase:
    """Delete a quiz by id"""
    db_quiz = db.get(Quiz, quiz_id)
    if not db_quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if db_quiz.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    db.delete(db_quiz)
    db.commit()
    return ResponseBase(message=f"Quiz {db_quiz.id} deleted")


# endregion
# region Predefined questions


@router.post("/quizzes/{quiz_id}/questions", operation_id="add_predefined_question")
async def add_predefined_question(
    quiz_id: uuid.UUID,
    question: QuestionCreate,
    db: Annotated[DatabaseSession, Depends(get_db_session)],
    user_id: Annotated[str, Depends(authenticate)],
) -> QuizPublicExtended:
    """Add a predefined question to the quiz that can be asked later during a session"""
    # Retrieve the quiz and check access
    db_quiz = db.get(Quiz, quiz_id)
    if not db_quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if db_quiz.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Store the new question in database as predefined and refresh quiz
    db_question = Question.model_validate(question, update={"predefined": True})
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    db.refresh(db_quiz)

    return db_quiz


# Custom class for updating a question (optional field was recommended by sqlmodel docs)
class QuestionUpdate(SQLModel):
    text: Optional[str] = None


@router.patch(
    "/quizzes/{quiz_id}/questions/{question_id}",
    operation_id="update_predefined_question",
)
async def update_predefined_question(
    quiz_id: uuid.UUID,
    question_id: uuid.UUID,
    question_update: QuestionUpdate,
    db: Annotated[DatabaseSession, Depends(get_db_session)],
    user_id: Annotated[str, Depends(authenticate)],
) -> QuizPublicExtended:
    """
    Partially update a predefined question.
    Only questions that belong to the quiz and are marked as predefined can be updated.
    This implementation uses the relationships already defined in setup.
    """
    # Retrieve the quiz and check access.
    db_quiz = db.get(Quiz, quiz_id)
    if not db_quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if db_quiz.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Retrieve the question and verify it belongs to this quiz.
    db_question = db.get(Question, question_id)
    if not db_question or db_question.quiz_id != quiz_id:
        raise HTTPException(status_code=404, detail="Question not found in this quiz")

    # This is to ensure sqlmodel_update can be called on the question.
    db_question = cast(Question, db_question)

    # Ensure that only predefined questions can be updated.
    if not db_question.predefined:
        raise HTTPException(
            status_code=400, detail="Only predefined questions can be updated"
        )

    # Get only the fields that were provided in the request.
    update_data = question_update.model_dump(exclude_unset=True)
    db_question.sqlmodel_update(update_data)

    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    db.refresh(db_quiz)

    return db_quiz


@router.delete(
    "/quizzes/{quiz_id}/questions/{question_id}",
    operation_id="delete_predefined_question",
)
async def delete_predefined_question(
    quiz_id: uuid.UUID,
    question_id: uuid.UUID,
    db: Annotated[DatabaseSession, Depends(get_db_session)],
    user_id: Annotated[str, Depends(authenticate)],
) -> QuizPublicExtended:
    """
    Delete a predefined question from a quiz.
    Only questions that belong to the quiz and are marked as predefined can be deleted.
    This leverages the relationships defined in setup (e.g. Question.quiz_id).
    """
    # Retrieve the quiz and check access.
    db_quiz = db.get(Quiz, quiz_id)
    if not db_quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if db_quiz.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Retrieve the question and verify it belongs to the quiz.
    db_question = db.get(Question, question_id)
    if not db_question or db_question.quiz_id != quiz_id:
        raise HTTPException(status_code=404, detail="Question not found in this quiz")

    # Ensure that only predefined questions are deleted.
    if not db_question.predefined:
        raise HTTPException(
            status_code=400, detail="Only predefined questions can be deleted"
        )

    db.delete(db_question)
    db.commit()
    db.refresh(db_quiz)
    return db_quiz


# endregion
# region Analyses


@router.get("/quizzes/{quiz_id}/analyses/sentiment", operation_id="get_quiz_sentiment")
async def get_quiz_sentiment(
    quiz_id: uuid.UUID,
    db: Annotated[DatabaseSession, Depends(get_db_session)],
    user_id: Annotated[str, Depends(authenticate)],
) -> list[SentimentAnalysisPublic]:
    """Retrieve all sentiment analyses tied to a quiz"""
    db_quiz = db.get(Quiz, quiz_id)
    if not db_quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if db_quiz.user_id != user_id and not is_admin(user_id):
        raise HTTPException(status_code=403, detail="Access denied")

    # Get sentiment analyses for quiz
    statement = (
        select(SentimentAnalysis)
        .join(Answer)
        .join(Question)
        .where(Question.quiz_id == db_quiz.id)
    )
    sentiments = db.exec(statement).all()
    return sentiments


@router.get("/quizzes/{quiz_id}/analyses/topics", operation_id="get_quiz_topics")
async def get_quiz_topics(
    quiz_id: uuid.UUID,
    db: Annotated[DatabaseSession, Depends(get_db_session)],
    user_id: Annotated[str, Depends(authenticate)],
) -> list[TopicPublic]:
    """Retrieve all topics tied to a quiz"""
    db_quiz = db.get(Quiz, quiz_id)
    if not db_quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if db_quiz.user_id != user_id and not is_admin(user_id):
        raise HTTPException(status_code=403, detail="Access denied")

    # Get topics for quiz
    statement = select(Topic).join(Question).where(Question.quiz_id == db_quiz.id)
    topics = db.exec(statement).all()
    return topics


@router.get("/quizzes/{quiz_id}/analyses/summaries", operation_id="get_quiz_summaries")
async def get_quiz_summaries(
    quiz_id: uuid.UUID,
    db: Annotated[DatabaseSession, Depends(get_db_session)],
    user_id: Annotated[str, Depends(authenticate)],
) -> list[SummaryPublic]:
    """Retrieve all summaries tied to a quiz"""
    db_quiz = db.get(Quiz, quiz_id)
    if not db_quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if db_quiz.user_id != user_id and not is_admin(user_id):
        raise HTTPException(status_code=403, detail="Access denied")

    # Get summaries for quiz
    statement = select(Summary).join(Question).where(Question.quiz_id == db_quiz.id)
    summaries = db.exec(statement).all()
    return summaries


class QuestionPublicFullAnalysis(QuestionPublic):
    summary: SummaryPublic | None = None
    answers: list[AnswerPublicExtended] = []
    topics: list[TopicExtended] = []


@router.get("/quizzes/{quiz_id}/analyses", operation_id="get_quiz_analyses")
async def get_quiz_analyses(
    quiz_id: uuid.UUID,
    db: Annotated[DatabaseSession, Depends(get_db_session)],
    user_id: Annotated[str, Depends(authenticate)],
) -> list[QuestionPublicFullAnalysis]:
    """Retrieve all analyses tied to a quiz"""
    db_quiz = db.get(Quiz, quiz_id)
    if not db_quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if db_quiz.user_id != user_id and not is_admin(user_id):
        raise HTTPException(status_code=403, detail="Access denied")

    questions_with_analysis: list[QuestionPublicFullAnalysis] = []
    for db_question in db_quiz.questions:
        overall_summary = [
            summary for summary in db_question.summaries if summary.topic_id is None
        ]
        questions_with_analysis.append(
            QuestionPublicFullAnalysis.model_validate(
                db_question,
                update={"summary": overall_summary[0] if overall_summary else None},
            )
        )

    return questions_with_analysis


# endregion
# region Question imports


@router.post("/quizzes/{quiz_id}/import", operation_id="import_questions")
async def import_questions(
    quiz_id: uuid.UUID,
    question_imports: list[str],
    db: Annotated[DatabaseSession, Depends(get_db_session)],
    user_id: Annotated[str, Depends(authenticate)],
) -> QuizPublic:
    """Import a set of questions and answers from file contents"""
    db_quiz = db.get(Quiz, quiz_id)
    if not db_quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if db_quiz.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    start_time = time.monotonic()

    # Parse and format the raw file contents
    formatting_results = await asyncio.gather(
        *[perform_import_formatting(raw_content) for raw_content in question_imports]
    )
    # Flatten list of lists
    formatting_results = [
        content for contents in formatting_results for content in contents
    ]
    logger.info(
        f"Imported file contents formated after {time.monotonic() - start_time}s"
    )

    # Store questions and answers in the database
    db_questions: list[Question] = []
    for formatting_result in formatting_results:
        db_question = Question(
            quiz_id=db_quiz.id,
            text=formatting_result.question,
        )
        db_question.answers = [
            Answer(question_id=db_question.id, text=answer)
            for answer in formatting_result.answers
        ]

        db.add(db_question)
        db_questions.append(db_question)
    db.commit()
    logger.info(f"Imported questions stored after {time.monotonic() - start_time}s")

    # Prepare the answers by correcting and translating them
    question_answers_map: dict[uuid.UUID, Iterable[AnalysisAnswer]] = {}
    for db_question in db_questions:
        documents = [answer.text for answer in db_question.answers]
        documents = await preprocessing.correct_and_translate(
            documents=documents,
        )

        if len(documents) == len(db_question.answers):
            question_answers_map[db_question.id] = [
                AnalysisAnswer(id=answer.id, text=document)
                for answer, document in zip(db_question.answers, documents)
            ]
        else:
            # Use original answers if preprocessing produced the wrong number of documents
            question_answers_map[db_question.id] = [
                AnalysisAnswer(id=answer.id, text=answer.text)
                for answer in db_question.answers
            ]
    logger.info(f"Prepared answers after {time.monotonic() - start_time}s")

    # Perform analyses asynchronously for the new questions
    tasks = [
        task
        for db_question in db_questions
        for task in (
            perform_summarisation(
                db=db,
                quiz=db_quiz,
                question=db_question,
                prepared_answers=question_answers_map[db_question.id],
            ),
            perform_sentiment_analysis(
                db=db,
                prepared_answers=question_answers_map[db_question.id],
            ),
            perform_topic_modelling(
                db=db,
                question=db_question,
                prepared_answers=question_answers_map[db_question.id],
            ),
        )
    ]
    await asyncio.gather(*tasks)

    # Perform topic summarisation on the new topics
    statement = select(Topic).where(
        Topic.question_id.in_([db_question.id for db_question in db_questions])
    )
    db_topics = db.exec(statement).all()
    prepared_answers = [
        answer for answers in question_answers_map.values() for answer in answers
    ]
    try:
        await perform_topic_summarisation(
            db=db,
            quiz=db_quiz,
            topics=db_topics,
            prepared_answers=prepared_answers,
        )
    except Exception as e:
        logger.debug("Topic summarisation step failed", exc_info=e)
        db.rollback()
    logger.info(f"Imported questions analysed after {time.monotonic() - start_time}s")

    db.refresh(db_quiz)
    return db_quiz


# endregion

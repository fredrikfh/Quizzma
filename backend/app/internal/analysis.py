import asyncio
import json
import logging
import os
from typing import Iterable

from dotenv import load_dotenv
from pydantic import ValidationError
from sqlmodel import Session as DatabaseSession, select

from app.database.setup import Answer, Question, Quiz, SentimentAnalysis, Summary, Topic
from processing.sentiment import roberta
from processing.topics import bertopic, lda
from processing.definitions import AnalysisRequest, Answer as AnalysisAnswer
from processing.sentiment.vader import analyse_sentiments
from processing.summary import openai_llm, openai_reasoning
from processing.formatting.question_import import (
    QuestionFormat,
    ResponseFormat as QuestionImportResponseFormat,
    run_formatting,
)

load_dotenv()
use_bert = os.getenv("USE_BERT", "false").strip() == "true"

logger = logging.getLogger("app")


async def perform_import_formatting(raw_content: str) -> list[QuestionFormat]:
    """
    Format the contents of a file import containing questions and related answers into JSON.
    If the file content already has the correct format, simply parse it.

    Arguments:
        raw_content (str): The raw file content to format.

    Returns:
        list[QuestionFormat]: The formatted file content as a list of questions and answers.
    """
    try:
        parsed_content = json.loads(raw_content)
        return QuestionImportResponseFormat.model_validate(
            {
                "content": parsed_content,
            }
        ).content
    except (json.JSONDecodeError, ValidationError):
        logger.debug("Running LLM formatting of file content")
        return await run_formatting(raw_content)


async def perform_sentiment_analysis(
    db: DatabaseSession,
    prepared_answers: list[AnalysisAnswer],
) -> list[SentimentAnalysis]:
    """
    Perform sentiment analysis on a set of answers.

    Arguments:
        db (DatabaseSession): Database session for persisting the generated topics.
        prepared_answers (list[AnalysisAnswer]): List of potentially preprocessed answers for which to calculate sentiments.

    Returns:
        list[SentimentAnalysis]: A list of sentiment analysis results, one per answer.
    """
    if use_bert:
        raw_results = await roberta.process(answers=prepared_answers)
    else:
        raw_results = await analyse_sentiments(answers=prepared_answers)

    db_sentiments = [
        SentimentAnalysis.model_validate(
            raw_result.model_dump(exclude={"answer"}),
            update={"answer_id": raw_result.answer.id},
        )
        for raw_result in raw_results
    ]
    db.add_all(db_sentiments)
    db.commit()

    return db_sentiments


async def perform_topic_modelling(
    db: DatabaseSession,
    question: Question,
    prepared_answers: list[AnalysisAnswer],
) -> list[Topic]:
    """
    Perform topic modelling on a set of answers belonging to a question.

    Arguments:
        db (DatabaseSession): Database session for persisting the generated topics.
        question (Question): The questions for which to perform topic modelling.
        prepared_answers (list[AnalysisAnswer]): List of potentially preprocessed answers related to the question.

    Returns:
        list[Topic]: A list of topics with their related answers.
    """
    if use_bert:
        raw_topics = await bertopic.process(
            answers=prepared_answers,
            question_id=question.id,
        )
    else:
        raw_topics = await lda.process(
            answers=prepared_answers,
            question_id=question.id,
        )

    db_answers = db.exec(select(Answer).where(Answer.question_id == question.id)).all()
    answer_map = {answer.id: answer for answer in db_answers}

    db_topics: list[Topic] = []
    for raw_topic in raw_topics:
        topic_answers = [
            answer_map[answer.id]
            for answer in raw_topic.answers
            if answer.id in answer_map
        ]
        db_topic = Topic.model_validate(raw_topic.model_dump(exclude={"answers"}))
        db_topic.answers = topic_answers
        db.add(db_topic)
        db_topics.append(db_topic)
    db.commit()

    return db_topics


async def perform_summarisation(
    db: DatabaseSession,
    quiz: Quiz,
    question: Question,
    prepared_answers: list[AnalysisAnswer],
    audience_count: int | None = None,
) -> Summary:
    """
    Perform summarisation on a set of answers belonging to a question.

    Arguments:
        db (DatabaseSession): Database session for persisting the generated summary.
        quiz (Quiz): The quiz the question to which the question belongs.
        question (Question): The question for which to perform summarisation.
        prepared_answers (list[AnalysisAnswer]): List of potentially preprocessed answers related to the question.
        audience_count (int | None): Optional number of participants in a session.

    Returns:
        Summary: The LLM summary.
    """
    summary_result = await openai_reasoning.process(
        AnalysisRequest(
            question=question.text,
            answers=[answer.text for answer in prepared_answers],
            quiz_name=quiz.name,
            quiz_description=quiz.description,
            audience_count=audience_count,
        )
    )

    db_summary = Summary(
        question_id=question.id,
        summary_text=summary_result.summary_text,
        algorithm=summary_result.algorithm,
        emoji=summary_result.emoji,
    )
    db.add(db_summary)
    db.commit()

    return db_summary


async def perform_topic_summarisation(
    db: DatabaseSession,
    quiz: Quiz,
    topics: Iterable[Topic],
    prepared_answers: Iterable[AnalysisAnswer],
    audience_count: int | None = None,
) -> list[Summary]:
    """
    Perform summarisation on a set of answers belonging to a topic.

    Arguments:
        db (DatabaseSession): Database session for persisting the generated topic summaries.
        quiz (Quiz): The quiz to which the topics belong.
        topic (Iterable[Topic]): A list of topics for which to perform summarisation.
        prepared_answers (list[AnalysisAnswer]): List of potentially preprocessed answers topic answers are mapped to.
        audience_count (int | None): Optional number of participants in a session.

    Returns:
        list[Summary]: The created LLM summaries.
    """
    topics = [topic for topic in topics if topic.summary is None]
    answer_map = {answer.id: answer for answer in prepared_answers}

    tasks = [
        openai_llm.process(
            AnalysisRequest(
                question=topic.question.text,
                topic_label=topic.label,
                answers=[
                    answer_map[answer.id].text
                    for answer in topic.answers
                    if answer.id in answer_map
                ],
                quiz_name=quiz.name,
                quiz_description=quiz.description,
                audience_count=audience_count,
            )
        )
        for topic in topics
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    db_summaries: list[Summary] = []
    for topic, result in zip(topics, results):
        if not isinstance(result, BaseException):
            db_summary = Summary(
                question_id=topic.question.id,
                topic_id=topic.id,
                summary_text=result.summary_text,
                algorithm=result.algorithm,
                emoji=result.emoji,
            )
            db.add(db_summary)
            db_summaries.append(db_summary)
        else:
            logger.debug(
                "Topic summarisation failed for a topic",
                extra={"topic_id": topic.id},
                exc_info=result,
            )
    db.commit()

    return db_summaries

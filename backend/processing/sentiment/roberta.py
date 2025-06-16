import asyncio
import logging
import os
import time

from dotenv import load_dotenv
import numpy as np
from scipy.special import softmax
from processing.definitions import Answer, SentimentAnalysisResult, Verdict

from transformers import (
    AutoTokenizer,
    AutoConfig,
    AutoModelForSequenceClassification,
    PreTrainedTokenizer,
    PreTrainedTokenizerFast,
    RobertaConfig,
    RobertaForSequenceClassification,
)
from transformers.modeling_outputs import SequenceClassifierOutput

load_dotenv()

logger = logging.getLogger("processing")

_use_bert = os.getenv("USE_BERT", "false").strip() == "true"

_verdict_mapping = dict(
    positive=Verdict.Positive,
    neutral=Verdict.Neutral,
    negative=Verdict.Negative,
)

_model_id = "cardiffnlp/twitter-roberta-base-sentiment-latest"


class RoBERTaSentimentManager:
    is_loaded: bool = False
    tokeniser: PreTrainedTokenizer | PreTrainedTokenizerFast
    config: RobertaConfig
    model: RobertaForSequenceClassification

    def load(self) -> None:
        """Load the RoBERTa model for sentiment analysis"""
        # Load only if the USE_BERT environment variable is set
        if not _use_bert:
            return

        logger.info(f"Loading sentiment RoBERTa model")
        self.tokeniser = AutoTokenizer.from_pretrained(_model_id)
        self.config = AutoConfig.from_pretrained(_model_id)
        self.model = AutoModelForSequenceClassification.from_pretrained(_model_id)

        self.is_loaded = True
        logger.info("Sentiment RoBERTa model loaded")


_manager = RoBERTaSentimentManager()
_manager.load()


def _process(answers: list[Answer]) -> list[SentimentAnalysisResult]:
    """
    Analyses the sentiment of each answer using a RoBERTa model.

    Parameters:
        answers (list[Answer]): A list of open-text student answers to a question.

    Returns:
        list[SentimentAnalysisResult]: A list with the following attributes:
            - algorithm: The name of the algorithm.
            - answer: The original answer.
            - verdict: A categorical sentiment label ('Positive', 'Neutral', 'Negative').
            - compound: The overall sentiment score (Not applicable for this sentiment model).
            - positive: The positive sentiment score.
            - neutral: The neutral sentiment score.
            - negative: The negative sentiment score.
    """
    if not _manager.is_loaded:
        logger.warning("Sentiment RoBERTa is not loaded")
        return []

    start_time = time.monotonic()
    results: list[SentimentAnalysisResult] = []

    for answer in answers:
        encoded_input = _manager.tokeniser(answer.text, return_tensors="pt")
        model_output: SequenceClassifierOutput = _manager.model(**encoded_input)
        scores = model_output.logits[0].detach().numpy()
        scores: np.ndarray = softmax(scores)

        ranking = np.argsort(scores)[::-1]
        verdict = _verdict_mapping[_manager.config.id2label[ranking[0]]]
        scores_with_labels = {
            _verdict_mapping[_manager.config.id2label[ranking[i]]]: scores[ranking[i]]
            for i in range(len(ranking))
        }

        results.append(
            SentimentAnalysisResult(
                algorithm=_model_id,
                answer=answer,
                verdict=verdict,
                compound=0.0,
                positive=scores_with_labels[Verdict.Positive],
                neutral=scores_with_labels[Verdict.Neutral],
                negative=scores_with_labels[Verdict.Negative],
            )
        )

    logger.debug(f"Time sentiment analysis: {time.monotonic() - start_time}s")
    return results


async def process(answers: list[Answer]) -> list[SentimentAnalysisResult]:
    """
    Analyses the sentiment of each answer using a RoBERTa model.

    Parameters:
        answers (list[Answer]): A list of open-text student answers to a question.

    Returns:
        list[SentimentAnalysisResult]: A list with the following attributes:
            - algorithm: The name of the algorithm.
            - answer: The original answer.
            - verdict: A categorical sentiment label ('Positive', 'Neutral', 'Negative').
            - compound: The overall sentiment score (Not applicable for this sentiment model).
            - positive: The positive sentiment score.
            - neutral: The neutral sentiment score.
            - negative: The negative sentiment score.
    """
    if not _manager.is_loaded:
        logger.warning("Sentiment RoBERTa is not loaded")
        return []

    loop = asyncio.get_running_loop()
    results = await loop.run_in_executor(None, _process, answers)
    return results

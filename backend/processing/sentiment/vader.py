import uuid
import nltk
from nltk.sentiment import SentimentIntensityAnalyzer

from processing.definitions import Answer, SentimentAnalysisResult

nltk.download("vader_lexicon", quiet=True)


async def analyse_sentiments(answers: list[Answer]) -> list[SentimentAnalysisResult]:
    """
    Analyses the sentiment of each response using the VADER lexicon.

    Parameters:
        answers (list[Answer]): A list of open-text student answers to a question.

    Returns:
        list[SentimentAnalysisResult]: A list with the following attributes:
            - algorithm: The name of the algorithm.
            - answer: The original answer.
            - verdict: A categorical sentiment label ('Positive', 'Neutral', 'Negative').
            - compound: The overall sentiment score (-1 to 1).
            - positive: The positive sentiment score.
            - neutral: The neutral sentiment score.
            - negative: The negative sentiment score.
    """
    sia = SentimentIntensityAnalyzer()
    results: list[SentimentAnalysisResult] = []

    for answer in answers:
        scores = sia.polarity_scores(answer.text)
        compound = scores["compound"]

        # Define sentiment categories based on compound score thresholds:
        if compound >= 0.05:
            verdict = "Positive"
        elif compound <= -0.05:
            verdict = "Negative"
        else:
            verdict = "Neutral"

        results.append(
            SentimentAnalysisResult(
                algorithm="VADER",
                answer=answer,
                verdict=verdict,
                compound=compound,
                positive=scores["pos"],
                neutral=scores["neu"],
                negative=scores["neg"],
            )
        )

    return results


async def main() -> None:
    # Sample student responses
    responses = [
        Answer(id=uuid.uuid4(), text=text)
        for text in [
            "I loved the lecture, it was engaging and clear!",
            "The class was okay, but I wish there was more detail.",
            "I didn't understand the topic at all; it was confusing.",
            "Great explanation, really helped me grasp the concepts.",
        ]
    ]

    sentiment_results = await analyse_sentiments(responses)
    for result in sentiment_results:
        print(result.model_dump_json(indent=2))

import asyncio
import logging
import os
import threading
from time import time
import uuid
from bertopic import BERTopic
from bertopic.representation import KeyBERTInspired, OpenAI
from dotenv import load_dotenv
from hdbscan import HDBSCAN
import openai
from pandas import Series
from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import CountVectorizer
from umap import UMAP

from processing.definitions import Answer, TopicModellingResult

load_dotenv()

logger = logging.getLogger("processing")

_use_bert = os.getenv("USE_BERT", "false").strip() == "true"


class BERTopicManager:
    use_openai_representation: bool
    is_loaded: bool = False
    thread_lock: threading.Lock

    representation_model: dict = {}
    embedding_model: SentenceTransformer
    umap_model: UMAP
    hdbscan_model: HDBSCAN
    vectorizer_model: CountVectorizer
    topic_model: BERTopic

    def __init__(self, use_openai_representation: bool = False):
        self.use_openai_representation = use_openai_representation
        self.thread_lock = threading.Lock()

    def load(self) -> None:
        """Load models for clustering answers into topics represented with a label and a list of terms"""
        # Load only if the USE_BERT environment variable is set
        if not _use_bert:
            return

        logger.info("Loading BERTopic model")
        self.representation_model["KeyBERT"] = KeyBERTInspired()

        openai_api_key = os.getenv("OPENAI_API_KEY")
        if self.use_openai_representation and openai_api_key:
            prompt = """
            I have a topic that contains the following documents:
            [DOCUMENTS]
            The topic is described by the following keywords: [KEYWORDS]

            Based on the information above, extract a short but highly descriptive topic label of at most 4 words. Make sure it is in the following format:
            topic: <topic label>
            """
            self.representation_model["OpenAI"] = OpenAI(
                client=openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY")),
                model="gpt-4o-mini",
                exponential_backoff=True,
                chat=True,
                prompt=prompt,
            )

        # Load embedding model - Turns text into semantic vectors
        self.embedding_model = SentenceTransformer(
            model_name_or_path="sentence-transformers/all-MiniLM-L6-v2",
            device="cpu",
        )
        # Load UMAP model - Reduces dimensionality of vectors
        self.umap_model = UMAP(
            n_neighbors=10,  # Lower leads to more clusters
            n_components=3,  # Must be two or less than the number of responses
            min_dist=0.0,  # Lower is better for clustering
            metric="cosine",  # Good for textual data
            low_memory=False,
        )
        # Load HDBSCAN model - Clusters the vectors
        self.hdbscan_model = HDBSCAN(
            min_cluster_size=5,
            min_samples=1,
            cluster_selection_method="eom",
            cluster_selection_epsilon=0.4,
            allow_single_cluster=False,
        )
        # Load vectoriser model - Preprocessing to improve keyword extraction
        self.vectorizer_model = CountVectorizer(
            stop_words="english",
            ngram_range=(1, 2),
        )
        # Set up the BERTopic pipeline
        self.topic_model = BERTopic(
            language="multilingual",
            embedding_model=self.embedding_model,
            umap_model=self.umap_model,
            hdbscan_model=self.hdbscan_model,
            representation_model=self.representation_model,
            vectorizer_model=self.vectorizer_model,
        )
        self.is_loaded = True
        logger.info("BERTopic model loaded")


_manager = BERTopicManager(use_openai_representation=True)
_manager.load()


def _get_label(series: Series, labels: list[str]) -> str:
    """
    Get a unique label for a topic.

    Args:
        series (Series): A pandas Series with topic data.
        labels (list[str]): Labels that have already been assigned to some topic.

    Returns:
        str: The selected label.
    """
    if series["Topic"] == -1:
        return "Outlier answers"
    if "OpenAI" in series and len(series["OpenAI"]) > 0:
        return series["OpenAI"][0]

    if "KeyBERT" in series:
        keybert_words = [
            keyword.capitalize()
            for keyword in series["KeyBERT"]
            if keyword.capitalize() not in labels
        ]
        if len(series["KeyBERT"]) > 0:
            return keybert_words[0]

    return " ".join([word.capitalize() for word in series["Representation"][:3]])


def _process(
    answers: list[Answer],
    question_id: uuid.UUID,
) -> list[TopicModellingResult]:
    """
    Perform topic modeling with BERTopic on a list of answers and assign a topic to each answer.

    Args:
        answers (List): List of Answer objects (or SQLModel instances) containing text responses.
        question_id (uuid.UUID): The ID of the question to associate topics with.

    Returns:
        list[TopicModellingResult]: List of topics with related answers.
    """
    start_time = time()

    # Run the BERTopic pipeline in separate thread
    documents = [answer.text for answer in answers]
    embeddings = _manager.embedding_model.encode(documents)

    # The topic model is not thread-safe
    with _manager.thread_lock:
        topic_indices, _ = _manager.topic_model.fit_transform(
            documents=documents,
            embeddings=embeddings,
        )
        row_iterator = _manager.topic_model.get_topic_info().iterrows()

    # Map original answers to correct topics
    answer_mapping: dict[int, Answer] = {}
    for i, answer in zip(topic_indices, answers):
        if i in answer_mapping:
            answer_mapping[i].append(answer)
        else:
            answer_mapping[i] = [answer]

    # Create the final topic objects
    final_topics: list[TopicModellingResult] = []
    labels: list[str] = []
    for _, series in row_iterator:
        topic_index = series["Topic"]

        label = _get_label(series, labels)
        labels.append(label)
        representation: str = ",".join(series["Representation"])

        included_answers: list[Answer] = []
        if topic_index in answer_mapping:
            included_answers = answer_mapping[topic_index]

        final_topics.append(
            TopicModellingResult(
                id=uuid.uuid4(),
                algorithm="BERTopic",
                question_id=question_id,
                label=label,
                topic=representation,
                answers=included_answers,
            )
        )

    logger.debug(f"Time BERTopic: {time() - start_time}")
    return final_topics


async def process(
    answers: list[Answer], question_id: uuid.UUID
) -> list[TopicModellingResult]:
    """
    Perform topic modelling with BERTopic on a list of answers and assign a topic to each answer.
    Run the processing in a separate thread.

    Args:
        answers (List): List of Answer objects (or SQLModel instances) containing text responses.
        question_id (uuid.UUID): The ID of the question to associate topics with.

    Returns:
        list[TopicModellingResult]: List of topics with related answers.
    """
    if not _manager.is_loaded:
        logger.warning("BERTopic is not loaded")
        return []

    # Return all answers as Outliers if topic modelling is not possible
    if len(answers) < _manager.umap_model.n_components + 2:
        logger.debug("Too few answers to perform topic modelling")
        return [
            TopicModellingResult(
                id=uuid.uuid4(),
                algorithm="BERTopic",
                question_id=question_id,
                label="Outlier answers",
                topic="",
                answers=answers,
            )
        ]

    # Perform processing in separate thread and await result
    loop = asyncio.get_running_loop()
    topics = await loop.run_in_executor(None, _process, answers, question_id)
    return topics

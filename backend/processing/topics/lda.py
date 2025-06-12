import uuid
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.decomposition import LatentDirichletAllocation

from ..definitions import Answer, TopicModellingResult


async def process(
    answers: list[Answer],
    question_id: uuid.UUID,
    n_topics: int = 6,
    n_top_words: int = 10,
) -> list[TopicModellingResult]:
    """
    Perform LDA topic modeling on a list of answers and assign a dominant topic to each answer.

    Args:
        answers (List): List of Answer objects (or SQLModel instances) containing text responses.
        question_id (uuid.UUID): The ID of the question to associate topics with.
        n_topics (int): Number of topics for LDA.
        n_top_words (int): Number of top words to extract per topic.

    Returns:
        list[Topic]: List of topics with related answers.
    """
    # Extract text from each answer.
    documents = [answer.text for answer in answers]

    # Vectorize the documents (with stop words removed)
    vectorizer = CountVectorizer(stop_words="english", max_features=1000)
    try:
        X = vectorizer.fit_transform(documents)
    except ValueError:
        return []

    # Run LDA.
    lda = LatentDirichletAllocation(n_components=n_topics, random_state=42)
    lda.fit(X)

    # Build the topics: for each LDA component, extract the top words and generate a unique UUID.
    words = vectorizer.get_feature_names_out()
    topics: list[TopicModellingResult] = []
    topic_map: dict[int, TopicModellingResult] = {}
    for topic_idx, topic in enumerate(lda.components_):
        top_terms = [words[i] for i in topic.argsort()[: -n_top_words - 1 : -1]]

        # Use the first top term as the label for the topic
        topic_label = top_terms[0]
        topic_str = ", ".join(top_terms)

        topic = TopicModellingResult(
            id=uuid.uuid4(),
            algorithm="Latent Dirichlet Allocation",
            question_id=question_id,
            label=topic_label,
            topic=topic_str,
            answers=[],
            score=100,
        )
        topics.append(topic)
        topic_map[topic_idx] = topic

    # For each document, choose the dominant topic (highest probability)
    doc_topic_dist = lda.transform(X)
    dominant_topic_indices = doc_topic_dist.argmax(axis=1)

    # Assign each answer to its dominant topic
    for answer, topic_idx in zip(answers, dominant_topic_indices):
        topic_map[topic_idx].answers.append(answer)

    return topics

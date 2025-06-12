from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords

from processing.preprocessing import openai_language_processing


async def lowercase(documents: list[str]) -> list[str]:
    """Convert all documents to lowercase"""
    return [document.lower() for document in documents]


async def remove_stopwords(documents: list[str]) -> list[str]:
    """Remove stop-words from documents"""
    return [
        " ".join(
            [
                word
                for word in word_tokenize(document, language="english")
                if word not in stopwords.words("english")
            ]
        )
        for document in documents
    ]


async def correct_and_translate(documents: list[str]) -> list[str]:
    """Correct spelling mistakes in and translate the documents to English"""
    return await openai_language_processing.process(documents)

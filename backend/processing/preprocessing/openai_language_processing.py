import asyncio
import json
import logging
import time
from pydantic import BaseModel

from processing.llm.openai import client

logger = logging.getLogger("processing")


type Batch = list[str]


class ResponseFormat(BaseModel):
    result: list[str]


model_id = "gpt-4o-mini"
prompt_template = """
Your task is to fix simple spelling errors and translate the text from the detected language to English.
Respond in valid JSON!

The following list of text strings is a list of answers submitted by students to a question asked by a teacher through a student response system during a lecture.
Correct any misspelled words in the text and return the list of answers as valid JSON.
[If no corrections are required, return the original list. Correct ONLY misspellings, and do not fix punctuation, grammar, or casing.
Terms like "healthcare" that can be spelled as one word or two distinct words ("health" and "care") should always be returned as one word.
Expand all abbreviated words such as "dem(s)," "rep(s)," "gov," and "govt." Do not expand acronyms. Always include the dash for words with pro- or anti- in them.]
Be aware that the answers may be written in different languages, and that you should make sure all of the text is also translated to English in addition to correcting the grammar mistakes.

Answers:
"""


async def _batch(documents: list[str]) -> list[Batch]:
    """
    An LLM's processing time increases linearly with the number of output tokens.
    We speed up the processing by splitting the documents into batches which
    can be processed by the OpenAI API in parallel.
    """
    chars_per_batch = 4 * 30 * 5  # Chars per token * tokens per second * seconds

    batches: list[Batch] = []
    current_batch: list[str] = []
    current_batch_size = 0

    for document in documents:
        if current_batch_size >= chars_per_batch:
            batches.append(current_batch)
            current_batch_size = 0
            current_batch = []
        current_batch.append(document)
        current_batch_size += len(document)
    if current_batch:
        batches.append(current_batch)

    return batches


async def _process(batch: Batch) -> list[str]:
    """Process the document batch by promting the LLM through the OpenAI API"""
    messages = [
        {
            "role": "user",
            "content": f"{prompt_template} [\"{'\",\n\"'.join(batch)}\"]",
        },
    ]
    logger.debug(f"Prompt: {json.dumps(messages, indent=2)}")

    chat_completion = await client.beta.chat.completions.parse(
        model=model_id,
        messages=messages,
        response_format=ResponseFormat,
        temperature=0.5,
        n=1,
    )
    parsed_response = chat_completion.choices[0].message.parsed

    if parsed_response:
        return parsed_response.result
    logger.warning("OpenAI LLM failed to correct and translate a document batch")
    raise ValueError("OpenAI LLM failed to correct and translate a document batch")


async def process(documents: list[str]) -> list[str]:
    """
    Prompt the OpenAI language model to correct spelling mistakes and
    translate the documents to English.

    Parameters:
        documents (list[str]): The documents to process.

    Returns:
        list[str]: The documents after spelling correction and translation.
    """
    start_time = time.monotonic()

    batches = await _batch(documents)
    results = await asyncio.gather(*[_process(batch) for batch in batches])
    documents = [document for result in results for document in result]

    logger.debug(f"Corrected and translated after {time.monotonic() - start_time}s")
    return documents

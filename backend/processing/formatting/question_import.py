import logging

from openai.types.chat import ChatCompletionMessageParam
from pydantic import BaseModel

from ..llm.openai import client


logger = logging.getLogger("processing")


class QuestionFormat(BaseModel):
    question: str
    answers: list[str]


class ResponseFormat(BaseModel):
    content: list[QuestionFormat]


system_prompt: ChatCompletionMessageParam = {
    "role": "system",
    "content": """
    You will be provided with sets of questions and answers formatted as either .txt, .csv or .json.

    Your task is to:
        1. Extract the open-ended questions and their related open-text answers from the provided data.
        2. Ignore multiple-choice, likert-scale, range and similar questions.
        3. Structure the questions and answers into the requested JSON format.
        4. Respond in valid JSON!
    """,
}


async def run_formatting(content: str) -> list[QuestionFormat]:
    """
    Have an LLM reformat a .csv, .txt or .json file into a given format.

    Parameters:
        content (str): The content of the .csv, .txt or .json file to provide to the LLM.

    Returns:
        list[QuestionResponse]: A list of questions with their related answers.
    """
    user_prompt: ChatCompletionMessageParam = dict(
        role="user",
        content=content,
    )

    messages = [system_prompt, user_prompt]
    chat_completion = await client.beta.chat.completions.parse(
        messages=messages,
        model="gpt-4o-mini",
        response_format=ResponseFormat,
        n=1,
    )

    json_response = chat_completion.choices[0].message.content
    response = ResponseFormat.model_validate_json(json_response)

    return response.content

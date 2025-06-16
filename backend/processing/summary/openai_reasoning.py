import json
import logging
import time

from openai.types.chat import ChatCompletionMessageParam
from pydantic import BaseModel

from processing.definitions import AnalysisRequest, SummaryResult
from processing.llm.openai import client

logger = logging.getLogger("processing")


class ResponseFormat(BaseModel):
    text: str
    emoji: str


_json_response_format: str = json.dumps(
    ResponseFormat.model_json_schema(mode="serialization"),
    indent=2,
)


_model_id = "o3-mini"
_general_template = """
You are in a lecture setting where students answer questions through a student response system.
You will be provided with three pieces of information:
    1. Context about the current quiz and ongoing lecture session.
    2. The current question.
    3. A list of student answers to that question.

Your task is to summarise the main insights from the answers to the question distributed accross 2 or 3 bullet points of max 10 words each:
- Summary shall help the teacher make decisions
- Summary shall help the teacher gauge the students' understanding or feedback related to the question
- Summary shall help the teacher discover both patterns and curiosities in the answers
- Be as concrete as possible, avoid giving general advice!

Example 1:
Quiz name: "Core macroeconomic concepts"
Number of participants: 72
Number of answers: 24
Question: "Was there anything you did't understand about inflation?"
Do not generate a general summary like "- Students are confused about inflation causes\n\n- Many misunderstandings about inflation dynamics\n\n- Provide clearer explanations on inflation concepts"
Rather generate a summary like "- Few students responded\n\n- Some confusion around central bank's role\n\n- Struggling with the causes (salaries, financial markets, war)

Example 2:
Quiz name: "Review session"
Quiz description: "Gather feedback from students on this 3rd year mathematics course"
Number of participants: 112
Number of answers: 97
Question: "What did you think about the assignments in this course?"
Do NOT generate a general summary like "- Most students are happy with the assignments and perceive them positively\n\n- Some negative responses concerning workload"
Rather generate a summary like "- Majority thinks "good" and "helpful", highlighting tasks' relevance\n\n- Suggestions for fewer assignments and deadline at 23:59

No more than 25 words!
Respond in valid JSON based on the following format:
<|response_format|>

Quiz context: <|quiz_context|>

Question: <|question|>

Answers: <|answer|>
"""

_topic_template = """
You are in a lecture setting where students answer questions through a student response system.
Topic modelling has been performed on the students' answer to a question.
You will be provided with four pieces of information:
    1. Context about the current quiz and ongoing lecture session.
    2. The current question.
    3. The label of the topic.
    4. A list of student answers grouped under the topic.

Your task is to summarise the main insights from the answers in the topic distributed accross 1 to 3 bullet points of max 8 words each:
- Summary shall provide the teacher with a quick, but concrete, overview of the topic
- Summary shall help the teacher discover both patterns and curiosities in the answers
- Be as concrete as possible, avoid giving general advice!

Example 1:
Quiz name: "Det grønne skiftet"
Number of answers: 6
Question: "Hvordan kan staten hjelpe bedrifter med å omstille seg?"
Topic: "Energy"
Do not generate a general summary like "- Invest in renewable energy to help businesses transition"
Rather generate a summary like "- Make hydro, wind, solar available through investment\n\n- One says cutting EU electricity cables"

Example 2:
Quiz name: "Mid-term feedback"
Quiz description: "October 10th A17"
Number of answers: 26
Question: "How do you perceive the pace of the course?"
Topic: "Fast"
Do NOT generate a general summary like "- Many find the pace of the course too fast\n\n- Too long assignments and intensive lectures"
Rather generate a summary like "- Struggling to keep up\n\n- 10 tasks per assignment too much\n\n- Offload more to course book"

No more than 20 words!
Respond in valid JSON based on the following format:
<|response_format|>

Quiz context: <|quiz_context|>

Question: <|question|>

Topic: <|topic|>

Answers: <|answer|>
"""


async def _synth_user_prompt(request: AnalysisRequest) -> ChatCompletionMessageParam:
    """
    Synthesise the user prompt containing instructions, context for the quiz, the question and the answers.

    Parameters:
        request (AnalysisRequest): The information to be provided in the user prompt.

    Returns:
        ChatCompletionMessageParam: The synthesised user prompt in the format expected by the OpenAI client.
    """
    quiz_context = f"\n    - Quiz name: {request.quiz_name}"
    if request.quiz_description is not None and not request.quiz_description == "":
        quiz_context += f"\n    - Quiz description: {request.quiz_description}"
    if request.audience_count is not None:
        quiz_context += f"\n    - Number of participants: {request.audience_count}"
    quiz_context += f"\n    - Number of answers: {len(request.answers)}"

    topic_label = request.topic_label if request.topic_label is not None else ""

    prompt = _general_template if topic_label == "" else _topic_template
    prompt = prompt.replace("<|response_format|>", _json_response_format, 1)
    prompt = prompt.replace("<|quiz_context|>", quiz_context, 1)
    prompt = prompt.replace("<|question|>", request.question, 1)
    prompt = prompt.replace("<|topic|>", topic_label, 1)
    prompt = prompt.replace("<|answer|>", f"[\"{'\",\n\"'.join(request.answers)}\"]", 1)

    return {"role": "user", "content": prompt}


async def process(request: AnalysisRequest) -> SummaryResult:
    """
    Process the analysis request by prompting the LLM to produce a summary of a list of open-text answers.

    Parameters:
        request (AnalysisRequest): The information to be provided to the LLM.

    Returns:
        SummaryResult: The summary produced by the LLM.
    """
    start_time = time.monotonic()
    user_prompt = await _synth_user_prompt(request=request)

    logger.debug(f"Prompt for OpenAI {_model_id}:\n{user_prompt['content']}")

    response = await client.chat.completions.create(
        messages=[user_prompt],
        model=_model_id,
        reasoning_effort="low",
        n=1,
    )

    json_response = response.choices[0].message.content
    response = ResponseFormat.model_validate_json(json_response)

    logger.debug(f"Time OpenAI {_model_id}: {time.monotonic() - start_time}s")

    return SummaryResult(
        algorithm=_model_id,
        summary_text=response.text,
        emoji=response.emoji,
    )

from fastapi import APIRouter


router = APIRouter()


@router.get("/question", operation_id="get_question")
async def get_question():
    pass


@router.post("/answer", operation_id="submit_answer")
async def submit_answer():
    pass


@router.post("/join", operation_id="join_session")
async def join_session():
    pass


@router.post("/leave", operation_id="leave_session")
async def leave_session():
    pass


@router.post("/feedback", operation_id="submit_feedback")
async def submit_feedback():
    pass

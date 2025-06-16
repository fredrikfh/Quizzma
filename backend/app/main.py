from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database.setup import configure_db

from .routers import host, session

import firebase_admin
from firebase_admin import credentials

cred = credentials.Certificate("./quizzmaFirebaseServiceAccountKey.json")
firebase_admin.initialize_app(cred)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup: Code before yield is executed before receiving requests.
    Shutdown: Code after yield is executed after having stopped receiving requests.
    """
    configure_db()
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://backend.quizzma.no",
        "https://quizzma.no",
        "http://backend.quizzma.no",
        "http://quizzma.no",
        "http://backend-openstack.quizzma.no",
        "https://backend-openstack.quizzma.no",
        "http://fonnweb.no",
        "https://fonnweb.no",
    ],
    allow_origin_regex=r"http://localhost(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(host.router, prefix="/host", tags=["Host"])
app.include_router(session.router, prefix="/sessions", tags=["Sessions"])

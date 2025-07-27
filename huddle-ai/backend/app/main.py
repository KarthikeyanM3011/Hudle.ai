from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .core.database import engine
from .models import user, meeting, ai_profile, chat
from .routes import auth, meetings, ai_profiles, chat as chat_routes, audio
import os

user.Base.metadata.create_all(bind=engine)
meeting.Base.metadata.create_all(bind=engine)
ai_profile.Base.metadata.create_all(bind=engine)
chat.Base.metadata.create_all(bind=engine)

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

app = FastAPI(
    title="Huddle.ai API",
    description="A GenAI-based coaching video call platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(meetings.router)
app.include_router(ai_profiles.router)
app.include_router(chat_routes.router)
app.include_router(audio.router)

@app.get("/")
async def root():
    return {"message": "Welcome to Huddle.ai API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
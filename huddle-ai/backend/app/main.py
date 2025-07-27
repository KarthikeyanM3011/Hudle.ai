from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .core.database import engine, Base
from .routes import auth, meetings, ai_profiles, chat as chat_routes, audio
import os

# Create FastAPI app first
app = FastAPI(
    title="Huddle.ai API",
    description="A GenAI-based coaching video call platform",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables only once and only if they don't exist
@app.on_event("startup")
async def startup_event():
    try:
        # This will only create tables that don't exist
        Base.metadata.create_all(bind=engine, checkfirst=True)
        
        # Ensure upload directory exists
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        
        print("Database tables created successfully")
    except Exception as e:
        print(f"Error during startup: {e}")

# Include routers
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
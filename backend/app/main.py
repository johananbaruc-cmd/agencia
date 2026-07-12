from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from app.api.v1 import router as v1_router

app = FastAPI(title="Agencia MX API", version="1.0.0")

# ✅ Configuración CORS completa
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://localhost:5174",
    "http://localhost:5175",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],  # ✅ Agregar esta línea
)

# ✅ SERVIR ARCHIVOS ESTÁTICOS
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "tasks"), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "chunks"), exist_ok=True)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Incluir routers
app.include_router(v1_router, prefix="/api")

@app.get("/")
def root():
    return {"message": "Agencia MX API", "status": "online"}

@app.get("/health")
def health():
    return {"status": "ok"}
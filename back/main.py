from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
import subprocess
import os
import glob
import time
from fastapi.middleware.cors import CORSMiddleware

# Usar      uvicorn main:app --host 0.0.0.0 --port 8000       para correr el servidor


app = FastAPI()

origins = [
    "http://localhost:8081",        # Example: your React or Vue frontend development server
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,          # Specific origins allowed
    allow_credentials=True,         # Allow cookies/authorization headers
    allow_methods=["*"],            # Allow all HTTP methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],            # Allow all headers
)

DOWNLOAD_DIR = "downloaded_songs"
os.makedirs(DOWNLOAD_DIR, exist_ok=True)


class DownloadRequest(BaseModel):
    url: str

@app.post("/download")
def download_song(data: DownloadRequest):
    try:
        # Ejecutar spotdl
        process = subprocess.run(
            [
                "spotdl",
                data.url,
                "--output",
                DOWNLOAD_DIR,
            ],
            capture_output=True,
            text=True
        )

        if process.returncode != 0: 
            raise HTTPException(
                status_code=500,
                detail=process.stderr
            )

        # buscar el archivo más reciente
        files = glob.glob(os.path.join(DOWNLOAD_DIR, "*"))
        if not files:
            raise HTTPException(status_code=404, detail="No se descargó ningún archivo")

        latest_file = max(files, key=os.path.getctime)

        return FileResponse(
            latest_file,
            filename=os.path.basename(latest_file),
            media_type="application/octet-stream"
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

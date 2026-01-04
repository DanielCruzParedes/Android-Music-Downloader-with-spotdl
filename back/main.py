from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import subprocess, os, glob, threading, uuid, time

app = FastAPI()

origins = ["*"]  # para desarrollo
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DOWNLOAD_DIR = "downloaded_songs"
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

# job storage simple (en memoria)
jobs = {}
jobs_lock = threading.Lock()

def run_spotdl_job(job_id: str, url: str):
    with jobs_lock:
        jobs[job_id]["status"] = "running"
        jobs[job_id]["started_at"] = time.time()

    try:
        # Ejecuta spotdl en background thread
        process = subprocess.run(
            ["spotdl", url, "--output", DOWNLOAD_DIR],
            capture_output=True,
            text=True
        )

        if process.returncode != 0:
            with jobs_lock:
                jobs[job_id]["status"] = "error"
                jobs[job_id]["error"] = process.stderr
            return

        # Encuentra el archivo .mp3 más reciente
        files = glob.glob(os.path.join(DOWNLOAD_DIR, "*.mp3"))
        if not files:
            with jobs_lock:
                jobs[job_id]["status"] = "error"
                jobs[job_id]["error"] = "No se generó archivo mp3"
            return

        latest_file = max(files, key=os.path.getctime)

        with jobs_lock:
            jobs[job_id]["status"] = "done"
            jobs[job_id]["file_path"] = os.path.abspath(latest_file)
            jobs[job_id]["finished_at"] = time.time()

    except Exception as e:
        with jobs_lock:
            jobs[job_id]["status"] = "error"
            jobs[job_id]["error"] = str(e)

@app.post("/start_download")
def start_download(url: str = Query(...)):
    if not url.startswith("http"):
        raise HTTPException(status_code=400, detail="URL inválida")

    job_id = str(uuid.uuid4())
    with jobs_lock:
        jobs[job_id] = {"status": "pending", "created_at": time.time()}

    # lanzar thread background
    thread = threading.Thread(target=run_spotdl_job, args=(job_id, url), daemon=True)
    thread.start()

    return {"job_id": job_id, "status": "pending"}

@app.get("/status/{job_id}")
def status(job_id: str):
    with jobs_lock:
        job = jobs.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job no encontrado")
        return job

@app.get("/file/{job_id}")
def get_file(job_id: str):
    with jobs_lock:
        job = jobs.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job no encontrado")
        if job.get("status") != "done":
            raise HTTPException(status_code=400, detail="Archivo no listo")
        path = job.get("file_path")
        if not os.path.isfile(path):
            raise HTTPException(status_code=404, detail="Archivo no encontrado")
        # Devuelve FileResponse (descarga rápida usando downloadFileAsync en front)
        return FileResponse(path=path, filename=os.path.basename(path), media_type="audio/mpeg")

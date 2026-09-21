from fastapi import FastAPI
import httpx
app = FastAPI()
client = httpx.Client(base_url="http://demo-productor.internal")

@app.get("/resumen/{id}")
def resumen(id: str):
    return client.get(f"/novedades/{id}").json()

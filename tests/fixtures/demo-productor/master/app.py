from fastapi import FastAPI
app = FastAPI()

@app.post("/novedades")
def crear_novedad():
    return {"ok": True}

@app.get("/novedades/{id}")
def consultar_novedad(id: str):
    return {"id": id}

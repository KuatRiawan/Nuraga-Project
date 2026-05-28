from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional

from ai_logic import predict_risk
from nlp_model import predict_text

app = FastAPI(title="Nuraga AI Service")

class HazardInput(BaseModel):
    description: str
    location: Optional[str] = ""

class PredictionRequest(BaseModel):
    text: str

@app.get("/")
def read_root():
    return {"message": "Nuraga AI Service is running"}

@app.post("/predict-risk")
def predict_risk_endpoint(hazard: HazardInput):
    return predict_risk(hazard.description, hazard.location)

@app.post("/predict-text")
def predict_text_endpoint(payload: PredictionRequest):
    return predict_text(payload.text)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

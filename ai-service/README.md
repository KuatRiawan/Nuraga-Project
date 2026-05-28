# Nuraga AI Service

Unified AI microservice for Nuraga.

## Endpoints

- `GET /` - service health check
- `POST /predict-risk` - risk prediction from hazard description and location
- `POST /predict-text` - NLP classification for safety incident text

## Setup

1. Create virtual environment
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Start service:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

## Notes

- `ai_logic.py` menangani rule-based risk scoring
- `nlp_model.py` memuat model `safety_model.joblib`
- `backend/controllers/aiController.js` dapat mengarahkan ke `AI_SERVICE_URL`

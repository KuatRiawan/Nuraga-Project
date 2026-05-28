import joblib
from pathlib import Path
from typing import Dict

MODEL_PATH = Path(__file__).resolve().parent / 'models' / 'safety_model.joblib'

try:
    model = joblib.load(MODEL_PATH)
except Exception as e:
    raise RuntimeError(f"Unable to load NLP model at {MODEL_PATH}: {e}")


def predict_text(text: str) -> Dict[str, object]:
    if not text or not text.strip():
        return {
            "success": False,
            "error": "Text input tidak boleh kosong."
        }

    try:
        prediction = model.predict([text])
        return {
            "success": True,
            "input_text": text,
            "prediction": prediction[0]
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

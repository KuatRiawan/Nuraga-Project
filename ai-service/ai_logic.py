from typing import Dict, Tuple

RISK_LEVELS: Dict[str, int] = {
    "Low": 1,
    "Medium": 2,
    "High": 3,
    "Critical": 4,
}

KEYWORD_RISKS: Dict[str, str] = {
    "fire": "Critical",
    "smoke": "Critical",
    "explosion": "Critical",
    "chemical": "Critical",
    "gas leak": "Critical",
    "leak": "High",
    "spill": "High",
    "electric": "High",
    "arc flash": "High",
    "sparks": "High",
    "broken": "High",
    "cable": "Medium",
    "slippery": "Medium",
    "wet floor": "Medium",
    "trip": "Medium",
    "obstruction": "Medium",
    "dust": "Low",
    "noise": "Low",
    "vibration": "Low",
    "fatigue": "Low",
    "heat": "Low",
    "cold": "Low",
}

LOCATION_RISKS: Dict[str, str] = {
    "boiler": "High",
    "electrical": "High",
    "transformer": "High",
    "storage": "Medium",
    "pipeline": "High",
    "tank": "High",
    "confined space": "Critical",
    "reactor": "Critical",
}

RECOMMENDATIONS: Dict[str, str] = {
    "Critical": "Hentikan aktivitas, evakuasi area, dan panggil tim HSE segera.",
    "High": "Lakukan inspeksi segera dan terapkan kontrol teknis sebelum lanjut.",
    "Medium": "Pantau area dan perkuat mitigasi sebelum bekerja lebih lanjut.",
    "Low": "Catat kondisi dan lakukan pemantauan rutin.",
}


def _map_to_highest_risk(current: str, candidate: str) -> str:
    if RISK_LEVELS[candidate] > RISK_LEVELS[current]:
        return candidate
    return current


def _score_description(description: str) -> Tuple[str, int]:
    description_lower = description.lower()
    risk = "Low"
    matches = 0

    for keyword, level in KEYWORD_RISKS.items():
        if keyword in description_lower:
            matches += 1
            risk = _map_to_highest_risk(risk, level)

    if matches == 0 and len(description_lower.split()) > 30:
        risk = _map_to_highest_risk(risk, "Medium")

    return risk, matches


def _score_location(location: str, current_risk: str) -> str:
    location_lower = location.lower()
    risk = current_risk
    for keyword, level in LOCATION_RISKS.items():
        if keyword in location_lower:
            risk = _map_to_highest_risk(risk, level)
    return risk


def _compute_confidence(matches: int, risk: str) -> float:
    base = 0.65 + min(0.25, matches * 0.08)
    if risk == "Critical":
        base += 0.08
    return round(min(base, 0.99), 2)


def predict_risk(description: str, location: str) -> Dict[str, object]:
    predicted_risk, matches = _score_description(description)
    predicted_risk = _score_location(location, predicted_risk)
    confidence = _compute_confidence(matches, predicted_risk)

    return {
        "predicted_risk": predicted_risk,
        "confidence": confidence,
        "recommendation": RECOMMENDATIONS.get(predicted_risk, "Lakukan tinjauan manual dan pastikan kontrol risiko.")
    }

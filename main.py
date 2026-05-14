from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
import joblib
import numpy as np
import pandas as pd
from pathlib import Path

# Create the app 
app = FastAPI(
    title="House Price Predictor",
    description="Predicts California median house value using a Random Forest model.",
    version="1.0.0"
)

# CORS 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*", "http://127.0.0.1:5500", "http://localhost:5500"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"]
)

# Load model files 
BASE_DIR   = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "model" / "model.pkl"
PREP_PATH  = BASE_DIR / "model" / "preprocessing.pkl"

try:
    model        = joblib.load(MODEL_PATH)
    preprocessor = joblib.load(PREP_PATH)
    print("Model and preprocessor loaded successfully.")
except FileNotFoundError as e:
    print(f"Could not load model files: {e}")
    model        = None
    preprocessor = None

# Data schema 
class HouseFeatures(BaseModel):
    longitude:           float
    latitude:            float
    housing_median_age:  float
    total_rooms:         float
    total_bedrooms:      float
    population:          float
    households:          float
    median_income:       float
    ocean_proximity:     str

    @field_validator("ocean_proximity")
    @classmethod
    def validate_ocean_proximity(cls, v):
        allowed = {"<1H OCEAN", "INLAND", "NEAR OCEAN", "NEAR BAY", "ISLAND"}
        if v not in allowed:
            raise ValueError(f"ocean_proximity must be one of {allowed}")
        return v

    @field_validator("total_bedrooms")
    @classmethod
    def validate_bedrooms(cls, v, info):
        if "total_rooms" in info.data and v > info.data["total_rooms"]:
            raise ValueError("total_bedrooms cannot exceed total_rooms")
        return v

    @field_validator("households")
    @classmethod
    def validate_households(cls, v, info):
        if "population" in info.data and v > info.data["population"]:
            raise ValueError("households cannot exceed population")
        return v

# Routes 

@app.get("/")
def home():
    return {"message": "House Price Predictor API is running!"}


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded":        model is not None,
        "preprocessor_loaded": preprocessor is not None
    }


@app.post("/predict")
def predict(features: HouseFeatures):

    # check model is loaded
    if model is None or preprocessor is None:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Add model.pkl and preprocessing.pkl to model/ folder."
        )

    # build DataFrame exactly like training
    data = {
        "longitude":          [features.longitude],
        "latitude":           [features.latitude],
        "housing_median_age": [features.housing_median_age],
        "total_rooms":        [features.total_rooms],
        "total_bedrooms":     [features.total_bedrooms],
        "population":         [features.population],
        "households":         [features.households],
        "median_income":      [features.median_income],
        "ocean_proximity":    [features.ocean_proximity]
    }
    df = pd.DataFrame(data)

    # feature engineering — must match Colab exactly
    df["rooms_per_house"]  = df["total_rooms"]    / df["households"]
    df["people_per_house"] = df["population"]     / df["households"]
    df["bedrooms_ratio"]   = df["total_bedrooms"] / df["total_rooms"]

    # preprocess and predict
    try:
        X     = preprocessor.transform(df)
        price = float(model.predict(X)[0])
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}"
        )

    return {"predicted_price": round(price, 2)}
from data_fetcher import fetch_data
from indicators import add_indicators
from model_trainer import train_regression_model

df = fetch_data()
df = add_indicators(df)
train_regression_model(df)
print("✅ Regression model trained and saved as reg_model.pkl")

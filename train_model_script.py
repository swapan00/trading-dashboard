from data_fetcher import fetch_data
from indicators import add_indicators
from model_trainer import train_model, train_regression_model

df = fetch_data(limit=300)
df = add_indicators(df)

train_model(df)
train_regression_model(df)

print("✅ Models trained with target price + time horizon")

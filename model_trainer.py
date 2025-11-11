from xgboost import XGBClassifier, XGBRegressor
import joblib

features = [
    'open', 'high', 'low', 'close', 'volume',
    'rsi', 'ema_20', 'macd', 'macd_diff',
    'volatility', 'rsi_3', 'ema_3'
]

def train_model(df):
    df = df.copy()
    df['target'] = (df['close'].shift(-1) > df['close']).astype(int)
    X = df[features]
    y = df['target']
    model = XGBClassifier().fit(X[:-1], y[:-1])
    joblib.dump(model, 'rf_model.pkl')
    return model

def load_model():
    return joblib.load('rf_model.pkl')

def train_regression_model(df):
    df = df.copy()
    df['target_pct'] = df['close'].pct_change().shift(-1) * 100
    df['time_to_target'] = 1
    X = df[features]
    y = df[['target_pct', 'time_to_target']]
    model = XGBRegressor().fit(X[:-1], y[:-1])
    joblib.dump(model, 'reg_model.pkl')
    return model

def load_regression_model():
    return joblib.load('reg_model.pkl')

def predict_pct_change(df, model):
    latest = df[features].dropna().iloc[-1:]
    pred = model.predict(latest)  # shape: (1, 2)
    pct_change = pred[0][0]       # extract % change
    return round(pct_change, 2)

def predict_target(df, model):
    latest = df[features].dropna().iloc[-1:]
    pred = model.predict(latest)[0]
    pct_change = round(float(pred[0]), 2)
    time_horizon = round(float(pred[1]), 2)
    current_price = df['close'].iloc[-1]
    target_price = round(current_price * (1 + pct_change / 100), 2)
    return pct_change, target_price, time_horizon

def estimate_price_range(df, predicted_pct):
    current_price = df['close'].iloc[-1]
    change_amount = current_price * (predicted_pct / 100)
    estimated_price = current_price + change_amount
    return round(current_price, 2), round(change_amount, 2), round(estimated_price, 2)

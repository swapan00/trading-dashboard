from sklearn.ensemble import RandomForestClassifier

def ml_predict(df):
    df = df.dropna()
    df['target'] = (df['close'].shift(-1) > df['close']).astype(int)
    X = df[['open','high','low','close','volume','rsi','ema_20','macd']]
    y = df['target']
    model = RandomForestClassifier().fit(X[:-1], y[:-1])
    pred = model.predict([X.iloc[-1]])[0]
    return 'buy' if pred == 1 else 'sell'

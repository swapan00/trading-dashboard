def aggregate_signals(df, model):
    df = df.dropna()
    features = ['open','high','low','close','volume','rsi','ema_20','macd','macd_diff','volatility','rsi_3','ema_3']
    latest = df[features].iloc[-1:]
    pred = model.predict(latest)[0]
    prob = model.predict_proba(latest)[0][pred]

    strat_signals = {
        'CANDLESTICK': 'HOLD',
        'RSI_EMA': 'HOLD',
        'MACD': 'SELL' if df['macd_diff'].iloc[-1] < 0 else 'BUY',
        'ML': 'SELL' if pred == 0 else 'BUY'
    }

    votes = list(strat_signals.values())
    final = max(set(votes), key=votes.count)
    confidence = round(prob * 100)

    return final, confidence, strat_signals

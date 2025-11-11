def detect_bullish_engulfing(df):
    last = df.iloc[-1]
    prev = df.iloc[-2]
    if prev['close'] < prev['open'] and last['close'] > last['open']:
        if last['open'] < prev['close'] and last['close'] > prev['open']:
            return 'buy'
    return 'hold'

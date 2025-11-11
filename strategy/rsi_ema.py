def rsi_ema_signal(df):
    if df['rsi'].iloc[-1] < 30 and df['close'].iloc[-1] > df['ema_20'].iloc[-1]:
        return 'buy'
    elif df['rsi'].iloc[-1] > 70 and df['close'].iloc[-1] < df['ema_20'].iloc[-1]:
        return 'sell'
    return 'hold'

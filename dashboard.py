import streamlit as st
import time
from data_fetcher import fetch_data
from indicators import add_indicators
from model_trainer import (
    load_model,
    load_regression_model,
    predict_pct_change,
    estimate_price_range
)
from signal_engine import aggregate_signals
from utils.charting import plot_candlestick

st.set_page_config(layout="wide")
st.title("📊 Smart Trading Dashboard")

# Timeframe selector
timeframe = st.selectbox("⏱️ Select Timeframe", ['15m', '1h', '4h', '1d'], index=1)

# Dynamic training range
limit_map = {'5m': 300,'15m': 200, '1h': 100, '4h': 80, '1d': 60}
limit = limit_map[timeframe]

# Live toggle
run_live = st.toggle("🔄 Run Live Dashboard", value=False)

# Load models
model = load_model()
reg_model = load_regression_model()

# Placeholders
chart_placeholder = st.empty()
signal_header = st.empty()
signal_metric = st.empty()
signal_confidence = st.empty()
signal_prediction = st.empty()
multi_prediction = st.empty()
signal_breakdown = st.empty()

def run_dashboard():
    df = fetch_data(timeframe=timeframe, limit=limit)
    df = add_indicators(df)

    # Final signal
    final_signal, confidence, all_signals = aggregate_signals(df, model)

    # Prediction for selected timeframe
    predicted_change = predict_pct_change(df, reg_model)
    current_price, change_amount, estimated_price = estimate_price_range(df, predicted_change)
    direction = "📉 Drop" if predicted_change < 0 else "📈 Rise"
    change_text = f"{'-' if predicted_change < 0 else '+'}${abs(change_amount)} → ${estimated_price}"

    # Multi-horizon predictions
    horizons = ['5m','1h', '4h', '1d']
    multi_preds = []
    for tf in horizons:
        df_h = fetch_data(timeframe=tf, limit=limit_map[tf])
        df_h = add_indicators(df_h)
        pred_pct = predict_pct_change(df_h, reg_model)
        cp, ca, ep = estimate_price_range(df_h, pred_pct)
        multi_preds.append((tf, pred_pct, ca, ep))

    # Chart
    fig = plot_candlestick(df)
    chart_placeholder.subheader(f"📈 Live Candlestick Chart ({timeframe})")
    chart_placeholder.plotly_chart(fig, use_container_width=True)

    # Final signal
    signal_header.subheader("📌 Final Signal")
    signal_metric.metric("Decision", final_signal.upper(), f"{confidence}% confidence")
    signal_prediction.metric("Predicted Move", f"{predicted_change}% {direction}", change_text)

    # Confidence meter
    if confidence >= 80:
        signal_confidence.success(f"High Confidence: {confidence}%")
    elif confidence >= 60:
        signal_confidence.warning(f"Moderate Confidence: {confidence}%")
    else:
        signal_confidence.error(f"Low Confidence: {confidence}%")

    # Multi-horizon prediction table
    with multi_prediction.expander("🔮 Multi-Horizon Prediction"):
        for tf, pct, ca, ep in multi_preds:
            dir = "📉 Drop" if pct < 0 else "📈 Rise"
            st.write(f"**{tf}** → {pct}% {dir}, {'-' if pct < 0 else '+'}${abs(ca)} → ${ep}")

    # Strategy breakdown
    with signal_breakdown.expander("🔍 Strategy Breakdown"):
        for strat, sig in all_signals.items():
            st.write(f"**{strat.upper()}**: {sig.upper()}")

# Run once or loop
if run_live:
    while True:
        run_dashboard()
        time.sleep(60)
else:
    run_dashboard()

import plotly.graph_objects as go

def plot_candlestick(df):
    fig = go.Figure(data=[
        go.Candlestick(x=df['timestamp'],
                       open=df['open'], high=df['high'],
                       low=df['low'], close=df['close'])
    ])
    fig.update_layout(xaxis_rangeslider_visible=False)
    return fig

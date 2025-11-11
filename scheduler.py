import schedule
import time
from data_fetcher import fetch_data
from indicators import add_indicators
from strategy import generate_signal
from notifier import send_alert

def job():
    df = fetch_data()
    df = add_indicators(df)
    signal = generate_signal(df)
    send_alert(signal)

def start_scheduler():
    schedule.every(10).seconds.do(job)
    while True:
        schedule.run_pending()
        time.sleep(1)

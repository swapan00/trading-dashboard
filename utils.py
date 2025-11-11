def save_to_csv(df, filename):
    df.to_csv(f"data/{filename}.csv", index=False)

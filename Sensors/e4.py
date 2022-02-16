import pandas as pd
import plotly.express as px
from datetime import datetime

def _clean_df(df):
    time_zero_str = df.columns[0]
    df = df.rename(columns={time_zero_str : "data"})
    time_zero = float(time_zero_str)
    frequency = int(df["data"].iloc[0])
    df = df[1:]
    df = df[df.index % frequency == 1]
    print(df)
    def _u_to_d(unixtime):
        dt = datetime.utcfromtimestamp(
            unixtime).strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
        return dt
    df["time"] = [_u_to_d((i)+time_zero) for i in range(len(df["data"]))] 
    return df



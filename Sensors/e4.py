import pandas as pd
import plotly.express as px
from datetime import datetime, timedelta
from utils import daylight_saving

TIME_DIFFERENCE = 1

def _clean_df(df):
    """
    Adds datetime and renames column header
        args:
            df : Dataframe to be cleaned (EDA, HR, BVP)
        return:
            df : Cleaned dataframe
    """
    # Column header is start time
    time_zero_str = df.columns[0]
    # Give a more suiting name
    df = df.rename(columns={time_zero_str : "data"})
    time_zero = float(time_zero_str)
    # Frequency is located on first row
    frequency = int(df["data"].iloc[0])
    # Remove frequency
    df = df[1:]
    # Only want one data point per second, removing row makes pandas indexing
    # wierd
    df = df[df.index % frequency == 1]

    def _u_to_d(unixtime):
        """ Translates unix time to datetime object """
        dt = datetime.utcfromtimestamp(unixtime)
        # Check for swedish daylight saving
        dt = daylight_saving(dt)
        return dt

    # Add a row displaying datetime per data
    df["time"] = [_u_to_d((i)+time_zero) for i in range(len(df["data"]))]
    return df

df = pd.read_csv("data/e4_wristband/session1/EDA.csv")
print(_clean_df(df))



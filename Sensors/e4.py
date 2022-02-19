import pandas as pd
import plotly.express as px
from datetime import datetime, timedelta
import os

from .utils import filter_by_date, daylight_saving

TIME_DIFFERENCE = 1


class E4Wristband():
    def __init__(self):
        self._datadir = 'data/e4_wristband'
        self._df = self._accumulate_data()
        #self.fig()


    def _accumulate_data(self):
        df = pd.DataFrame()
        for file in os.listdir(self._datadir):
            if '.csv' in file:
                df_tmp = pd.read_csv(os.path.join(self._datadir, file))
                time_zero = float(df_tmp.columns[0])
                if 'EDA' in file:
                    df_tmp = df_tmp.rename(columns={df_tmp.columns[0]: 'EDA'})
                elif 'HR' in file:
                    df_tmp = df_tmp.rename(columns={df_tmp.columns[0]: 'HR'})
                else:
                    df_tmp = df_tmp.rename(columns={df_tmp.columns[0]: 'BVP'})
                df_tmp = self._clean_df(df_tmp, time_zero)
                if df.empty:
                    df = df_tmp.copy()['time']
                df = pd.merge(df, df_tmp, on="time", how="outer")
        print(df)
        return df


    def _clean_df(self, df, time_zero):
        # Frequency is located on first row
        frequency = int(df[df.columns[0]].iloc[0])
        # Remove frequency
        df = df[1:]
        # Only want one data point per second
        df = df[(df.index-1) % frequency == 0]
        df = df.reset_index(drop=True)
        print(df)
        def _u_to_d(unixtime):
            """ Translates unix time to datetime object """
            dt = datetime.utcfromtimestamp(unixtime)
            # Check for swedish daylight saving
            dt = daylight_saving(dt)
            return dt
        # Add a row displaying datetime per data
        df["time"] = [_u_to_d((i)+time_zero) for i in range(len(df[df.columns[0]]))]
        return df


    def fig(self, date, time_range=[0, 24]):
        pass


def get_e4_bvp(path):
    ''' read ey temp data from specified path '''
    df = pd.read_csv(path)
    time = list(df)[0]
    hz = df[time][0]

    df['timestamp'] = [(float(time)+item/hz) for item in range(-1, len(df.index)-1)]
    df = df.iloc[1:]
    fig = px.line(df, x='timestamp', y=time)

    return fig

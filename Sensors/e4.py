import pandas as pd
import plotly.express as px
from datetime import datetime
import os

from .utils import filter_by_date


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
        frequency = int(df[df.columns[0]].iloc[0])
        df = df[1:]
        df = df[(df.index-1) % frequency == 0]
        df = df.reset_index(drop=True)
        print(df)
        def _u_to_d(unixtime):
            dt = datetime.utcfromtimestamp(
                unixtime).strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
            return dt
        df["time"] = [_u_to_d((i)+time_zero) for i in range(len(df[df.columns[0]]))]
        return df


    def fig(self, date, time_range=[0, 24]):
        pass

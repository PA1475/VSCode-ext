import pandas as pd
import plotly.express as px
from datetime import datetime
import os

from .utils import filter_by_date


class E4Wristband():
    def __init__(self):
        self._datadir = 'data/e4_wristband'
        self._df = accumulate_data()
        #self.fig()


    def accumulate_data(self):
        df = pd.DataFrame()
        for file in os.listdir(self._datadir):
            if '.csv' in file:
                df_tmp = pd.Dataframe()
                if 'EDA' in file: 
                    df_tmp['EDA'] = pd.read_csv(os.path.join(self._datadir, file))
                elif 'HR' in file:
                    df_tmp['HR'] = pd.read_csv(os.path.join(self._datadir, file))
                else:
                    df_tmp['BVP'] = pd.read_csv(os.path.join(self._datadir, file))
                df_tmp = self.clean_df(df_tmp)
                df = pd.concat([df, df_tmp])
        return df


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


    def fig(self, date, time_range=[0, 24]):
        pass

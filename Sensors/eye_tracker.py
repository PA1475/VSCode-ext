import os
import pandas as pd
import plotly.express as px

from datetime import datetime, date, timedelta
from .utils import filter_by_date

class EyeTracker():
    def __init__(self):
        self._datadir = 'data/eye_tracker/'
        self._df = self.accumulate_data()

    def fig(self, date, time_range=[0, 23]):
        ''' produce a plotply figure with a selected timeframe '''
        df = filter_by_date(self._df, date, time_range)
        fig = px.scatter(df,
                     x='FPOGX',
                     y='FPOGY',
                     animation_frame='time',
                     range_x=[0, 1],
                     range_y=[1, 0],
                     height=500,
                     width=500)
        return fig

    def accumulate_data(self):
        ''' merges all the different recordings to a single dataframe with cleaned data '''
        df = pd.DataFrame()
        for file in os.listdir(self._datadir):
            if '.csv' in file:
                df_temp = pd.read_csv(self._datadir + file)
                df_temp = self.clean_df(df_temp)
                df = pd.concat([df, df_temp])
        return df

    def clean_df(self, df):
        ''' cleans the dataframe '''
        def convert_to_dateformat(start, sec):
            timechange = timedelta(seconds=sec)
            return start + timechange

        desired_columns = [df.columns[3], 'FPOGX', 'FPOGY']
        df = df[desired_columns]
        start_time = df.columns[0]
        timeobj = datetime.strptime(start_time, 'TIME(%Y/%m/%d %H:%M:%S.%f)')
        df = df.rename(columns={start_time: 'time'})
        df['timeobj'] = df['time'].apply(lambda x: convert_to_dateformat(timeobj, x))
        
        # keeps every 40th record in the dataframe
        df = df[df.index % 40 == 0]
        return df
        
        
        

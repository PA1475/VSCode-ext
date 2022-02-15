import os
import pandas as pd
import plotly.express as px
import numpy as np

from datetime import datetime, date, timedelta
from .utils import filter_by_date
from .utils import remove_file

class EyeTracker():
    def __init__(self):
        self._datadir = 'data/eye_tracker/'
        self._df = self.accumulate_data()

    def fig(self, date, time_range=[0, 24]):
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

    def eye_tracker_cleanup(self,filepath):
        """
        Makes a new file based on the wanted column of the old file. Removes the old file and returns the file path of the new file.
        args:
            filepath: The filepath to the csv file to be cleaned up
        """
        try:
            new_df = pd.read_csv(filepath)
            new_df = new_df.rename(columns = {new_df.columns[3]: 'time'})
            new_df = new_df.iloc[0:,3:7]
            new_file_name = str(os.path.basename(filepath))
            new_df.to_csv(new_file_name)
            os.rename(new_file_name,filepath[:-4]+"_clean.csv")
            remove_file(filepath)
        except FileNotFoundError:
            print("File not found with filepath: '" +filepath+"'")  
    
    def clean_df(self, df):
        ''' cleans the dataframe '''
        def convert_to_dateformat(start, sec):
            timechange = timedelta(seconds=sec)
            return start + timechange

        desired_columns = [df.columns[3], 'FPOGX', 'FPOGY']
        df = df[desired_columns]
        start_time = df.columns[0]
        timeobj = datetime.strptime(start_time, 'TIME(%Y/%m/%d %H:%M:%S.%f)')
        #df = df.rename(columns={'TIME(2022/01/27 09:39:32.995)': 'time'})
        df['timeobj'] = df['time'].apply(lambda x: convert_to_dateformat(timeobj, x))
        return df
        
    def heat_map(self, date):
        df = pd.read_csv('data/eye_tracker/datainsamling/result_1/User 1_all_gaze.csv')

        a = np.zeros((36, 64))
        x_cords = df['FPOGX'].tolist()
        y_cords = df['FPOGY'].tolist()

        x_min = min(x_cords)
        x_max = max(x_cords)
        y_min = min(y_cords)
        y_max = max(y_cords)

        for i in range(len(x_cords)):
            x = int(((x_cords[i]-x_min)/(x_max-x_min))*36)
            y = int(((y_cords[i]-y_min)/(y_max-y_min))*64)

            a[x-1,y-1] += 1

        print(a)

        fig = px.imshow(a,color_continuous_scale=px.colors.sequential.Plasma,
                        title="Heatmap of eye tracking data")

        fig.show()

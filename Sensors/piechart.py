from pathlib import Path
import plotly.graph_objects as go
import pandas as pd
import plotly.express as px

import datetime
import numpy as np

class Piechart:
    def __init__(self):
        self.df = self.get_df()
    
    def get_df(self):
        df = pd.read_csv(Path(__file__).parent/"emotions.csv")
        return df

    def filter_df(self,df,date,time_range):
        day = date.strftime("%s")
        start = int(day) + int(time_range[0])*3600
        end = int(day) + int(time_range[1])*3600

        df = df[df['timestamps'] > start]
        df = df[df['timestamps'] < end]
        return df

    def create_pie(self,date,time_range):
        df = self.filter_df(self.df,date,time_range)
        fig = px.pie(df,values = "timestamps", names = "emotions")
        return fig



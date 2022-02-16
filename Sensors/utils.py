import pandas as pd
from datetime import datetime

def filter_by_date(df, date, time=[0, 23]):
    '''Returs a dataframe filtered by date and time
    args:
        df: dataframe with a column named timeobj, containing datetimeobbjects
        date: datetime object
        time: list with starting-hour and ending-hour, ex [8, 16] 
    '''
    start_hour = int(time[0])
    start_minutes = int((time[0] * 60) % 60)
    end_hour = int(time[1])
    end_minutes = int((time[1] * 60) % 60)

    start = datetime(date.year, date.month, date.day, start_hour, start_minutes)
    end = datetime(date.year, date.month, date.day, end_hour, end_minutes)

    df = df[df['timeobj'] > start]
    df = df[df['timeobj'] < end]
    
    return df

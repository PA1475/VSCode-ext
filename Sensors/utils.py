import pandas as pd
from datetime import date
import os

# TODO: filter by time, default is the whole day

def filter_by_date(df, date, time=[0, 24]):
    '''Returs a dataframe filtered by date and time
    args:
        df: dataframe with a column named timeobj, containing datetimeobbjects
        date: datetime object
        time: list with starting-hour and ending-hour, ex [8, 16] 
    '''
    df['date'] = df['timeobj'].apply(lambda x: x.date())
    df = df[df['date'] == date]
    return df

def remove_file(filepath):
    """Removes a file with the given filepath, if it exists
    args:
        filepath: path to the file to be removed
    """
    if os.path.exists(filepath):
        os.remove(filepath)
    else:
        print("Can not delete the file as it doesn't exists")
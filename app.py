import dash
from datetime import datetime, timedelta, date
import numpy as np
import dash_core_components as dcc
import dash_html_components as html
from dash.dependencies import Input, Output
import plotly.express as px
import pandas as pd
import dash_bootstrap_components as dbc
import os
import matplotlib.pyplot as plt

def remove_file(filePath):
    """Removes a file with the given filepath, if it exists"""
    if os.path.exists(filePath):
        os.remove(filePath)
    else:
        print("Can not delete the file as it doesn't exists")


#app = dash.Dash(__name__)
app = dash.Dash(__name__, external_stylesheets=[dbc.themes.BOOTSTRAP])

def filter_by_date(date, df):
    '''
    input
      df: dataframe with a column named timeobj, containing datetimeobbjects
      date: datetime date, can be created, from datetime import date, date(2022, 1, 27) for example
    output
      dataframe filtered be the data
    '''
    df['date'] = df['timeobj'].apply(lambda x: x.date())
    df = df[df['date'] == date.date()]
    return df

def eye_tracking_visualization(date):
    ''' process data and creating a figure '''

    def convert_to_dateformat(start, sec):
        timechange = timedelta(seconds=sec)
        return start + timechange

    eyedata = 'data/eye_tracker/result/User 1_all_gaze.csv'
    df = pd.read_csv(eyedata)

    df = df[['TIME(2022/01/27 09:39:32.995)', 'TIMETICK(f=10000000)', 'FPOGX', 'FPOGY']]
    start_time = df.columns[0]
    timeobj = datetime.strptime(start_time, 'TIME(%Y/%m/%d %H:%M:%S.%f)')
    df = df.rename(columns={'TIME(2022/01/27 09:39:32.995)': 'time'})
    df['timeobj'] = df['time'].apply(lambda x: convert_to_dateformat(timeobj, x))

    # the average time between records
    test_df = df.iloc[:20]
    diff = []
    curr = test_df['time'][0]
    for time in test_df['time'][1:]:
        diff.append(time - curr)
        curr = time
    time_between_records = np.array(diff).mean()

    # remove some records
    df = df[df.index % 40 == 0]
    df = filter_by_date(date, df)

    # Change width and height to match screen size, or create variable for aspect ratio
    fig = px.scatter(df,
                 x='FPOGX',
                 y='FPOGY',
                 animation_frame='time',
                 range_x=[0, 1],
                 range_y=[1, 0],
                 height=500,
                 width=500
    )
    return fig

def eye_tracking_heatmap():
    df = df.iloc[:,3:7]
    df = df.rename(columns = {'TIME(2022/02/09 15:49:20.545)': 'time'})
    
    x_coordinates = []
    y_coordinates = []
    
    for i in range(df.shape[0]):
        x_coordinates.append(df.iloc[i,2])
        y_coordinates.append(df.iloc[i,3])
    
    coordinates = [x_coordinates, y_coordinates] #Måste göras om till en 16x9-matris (är nu typ 7000x2)

    plt.imshow(coordinates, cmap='hot', interpolation='nearest')
    plt.show()

# defining the graph outside the layout for easier read
graph_card = dbc.Card(
    [
        dcc.Graph(
            id='eye_tracking_visualization')
    ]
)


# the layout
app.layout = html.Div(
    [
        html.H1(children='Emotion Aware Dashboard'),
        html.Hr(),
        dcc.DatePickerSingle(id='datepicker', date=date(2022, 1, 27)), 
        html.P('welcome to the most amazing app in the world where you get to know yourself at the deepest levels!'),
        html.P('starting with you eyes'),
        dbc.Row([graph_card], justify="center")
    ], style={'textAlign': 'center'}
)


@app.callback(
        Output('eye_tracking_visualization', 'figure'),
        Input('datepicker', 'date'))
def update_func(date):
    date = datetime.strptime(date, '%Y-%m-%d')
    return eye_tracking_visualization(date)

if __name__ == '__main__':
    app.run_server(host='localhost', debug=True)

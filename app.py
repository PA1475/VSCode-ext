from time import time
import dash
import os
from datetime import datetime, timedelta, date
import numpy as np
from dash import dcc
from dash import html
from dash.dependencies import Input, Output
import plotly.express as px
import pandas as pd
import dash_bootstrap_components as dbc


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

def e4_get_sessions():
    """ Uses os library to find all directories in e4_wristband directory"""
    PATH_STR = "data/e4_wristband/"
    dir_list = os.listdir(PATH_STR)
    return dir_list
        


def e4_data_cleanup(df, absolute_time=False):
    """ Function which cleans the dataframe and stores it in a dictionary
        with other key values                                         """

    data_dict = {}
    # Pandas makes the start time to the column header, only exists one column
    time_zero_str = df.columns[0]

    # Rename column header to a more fitting name
    df = df.rename(columns={time_zero_str : 'data'})
    data_dict["time_zero"] = float(time_zero_str)
    
    # Frequency stored as the first row value
    frequency = df.iloc[0]['data']
    data_dict['frequency'] = frequency
    # Convert to seconds
    data_sec = 1/frequency
    # Remove frequency 
    df = df.iloc[1:]
    
    # Treating start time as 0 or the time since 1970s
    total_time = 0
    if absolute_time:
        total_time = data_dict["time_zero"]

    # Every row multyplied with data_sec gives delta sec, add that to time_zero to get total time
    df["time"] = [((i+1)*data_sec) + total_time for i in range(len(df))]
    data_dict["df"] = df
    return data_dict

def e4_LineGraph(type_of_data="EDA", session='session1'):
    """ Create a displayable figure from csv file, function valid for the
        following data: [EDA, HR, BVP]                                """

    # Constants for now, if we implement dynamic size of browser
    BROWSER_HEIGHT = 500
    BROWSER_WIDTH = 750
    ACCEPTED_DATA = ["EDA", "HR", "BVP"]
    # Create correct path
    path_str = f"data/e4_wristband/{session}/{type_of_data}.csv"
    try:
        if (type_of_data not in ACCEPTED_DATA):
            raise "Wrong format."
        df = pd.read_csv(path_str)
    except Exception as e:
        print("ERROR: Incorrect data type or session.")
        return None
    
    # Get clean dataframe
    data = e4_data_cleanup(df)
    # Creating figure
    fig = px.line(data['df'],
                x = 'time',
                y = 'data',
                height=BROWSER_HEIGHT,
                width=BROWSER_WIDTH
    )
    return fig

    

# defining the graph outside the layout for easier read
graph_card = dbc.Card(
    [
        dcc.Graph(
            id='eye_tracking_visualization')
    ]
)

graph_card2 = dbc.Card(
    [
        dcc.Graph(
            id='e4_LineGraph',
            figure=e4_LineGraph()
        )
    ]
)

e4_sessions = e4_get_sessions()

# the layout
app.layout = html.Div(
    [
        html.H1(children='Emotion Aware Dashboard'),
        html.Hr(),
        dcc.DatePickerSingle(id='datepicker', date=date(2022, 1, 27)), 
        html.P('welcome to the most amazing app in the world where you get to know yourself at the deepest levels!'),
        html.P('starting with you eyes'),
        dbc.Row([graph_card], justify="center"),
        html.H2('Now for the E4 visualization! Use the tools below to customize your graph.'),
        dbc.Row(
            [
                dbc.Col(
                    [
                        html.P('Select data type'),
                        dcc.Dropdown(["EDA", "HR", "BVP"], "EDA", id='data_type_DD')
                    ]
                ),
                dbc.Col(
                    [
                        html.P('Select session'),
                        dcc.Dropdown(e4_sessions, e4_sessions[0], id='session_DD')
                    ]
                )
            ]
        ),
        dbc.Row(dbc.Col([graph_card2], align='center', width="auto") , justify="center")
    ], style={'textAlign': 'center'}
)

@app.callback(
        Output('eye_tracking_visualization', 'figure'),
        Input('datepicker', 'date'))
def update_func(date):
    date = datetime.strptime(date, '%Y-%m-%d')
    return eye_tracking_visualization(date)

@app.callback(
    Output('e4_LineGraph', 'figure'),
    [Input('data_type_DD', 'value'),
     Input('session_DD'  , 'value')])
def update_e4_LineGraph(data_type, session):
    return e4_LineGraph(data_type, session)

if __name__ == '__main__':
    app.run_server(host='localhost', debug=True)

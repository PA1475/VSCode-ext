import dash
import numpy as np
import dash_core_components as dcc
import dash_html_components as html
import plotly.express as px
import pandas as pd
import dash_bootstrap_components as dbc


#app = dash.Dash(__name__)
app = dash.Dash(__name__, external_stylesheets=[dbc.themes.BOOTSTRAP])

def eye_tracking_visualization():
    ''' process data and creating a figure '''
    eyedata = 'data/eye_tracker/result/User 1_all_gaze.csv'
    df = pd.read_csv(eyedata)
    df = df[['TIME(2022/01/27 09:39:32.995)', 'TIMETICK(f=10000000)', 'FPOGX', 'FPOGY']]
    df = df.rename(columns={'TIME(2022/01/27 09:39:32.995)': 'time'})
    test_df = df.iloc[:20]
    diff = []
    curr = test_df['time'][0]
    for time in test_df['time'][1:]:
        diff.append(time - curr)
        curr = time
    time_between_records = np.array(diff).mean()
    df = df[df.index % 40 == 0]
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

def e4_visualization(type_of_data="EDA", session=1):
    BROWSER_HEIGHT = 500
    BROWSER_WIDTH = 500
    # Create correct path
    path_str = f"data/e4_wristband/session{session}/{type_of_data}.csv"
    df = pd.read_csv(path_str)
    # Pandas makes the start time to the column header, only exists one column
    time_zero_str = df.columns[0]
    # Rename column header to a more fitting name
    df = df.rename(columns={time_zero_str : 'data'})
    time_zero = float(time_zero_str)
    frequency = df.iloc[0]['data']
    data_sec = 1/frequency
    # Remove frequency 
    df = df.iloc[1:]
    # Every row multyplied with data_sec gives delta sec, add that to time_zero to get total time
    df["time"] = [((i+1)*data_sec) for i in range(len(df))]
    max_time = df["time"].iloc[-1]
    min_time = 0
    max_data = df["data"].iloc[-1]
    min_data = df["data"].iloc[0]

    # Creating figure
    fig = px.line(df,
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
            id='eye_tracking_visualization',
            figure=eye_tracking_visualization())
    ]
)

graph_card2 = dbc.Card(
    [
        dcc.Graph(
            id='EDA_Graph',
            figure=e4_visualization()
        )
    ]
)

graph_card3 = dbc.Card(
    [
        dcc.Graph(
            id='HR_Graph',
            figure=e4_visualization("HR",2)
        )
    ]
)


# the layout
app.layout = html.Div(
    [
        html.H1(children='Emotion Aware Dashboard'),
        html.Hr(),
        html.P('welcome to the most amazing app in the world where you get to know yourself at the deepest levels!'),
        html.P('starting with you eyes'),
        dbc.Row([graph_card], justify="center"),
        html.P('And now your EDA'),
        dbc.Row([graph_card2], justify="center"),
        html.P("Here's your heart rate :)"),
        dbc.Row([graph_card3], justify="center")
    ], style={'textAlign': 'center'}
)

if __name__ == '__main__':
    app.run_server(host='localhost', debug=True)

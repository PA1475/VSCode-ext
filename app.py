import dash
from datetime import datetime, timedelta, date
import numpy as np
import dash_core_components as dcc
import dash_html_components as html
from dash.dependencies import Input, Output
import plotly.express as px
import pandas as pd
import dash_bootstrap_components as dbc
import Sensors.e4 as e4
from Sensors.eye_tracker import EyeTracker

app = dash.Dash(__name__, external_stylesheets=[dbc.themes.BOOTSTRAP])

eye_tracker = EyeTracker()

def e4_bvp_visualization():
    ''' process e4 data for bvp '''
    return e4.get_e4_bvp('../data/e4_wristband/session4/BVP.csv')

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
    date = datetime.strptime(date, '%Y-%m-%d').date()
    return eye_tracker.fig(date)

if __name__ == '__main__':
    app.run_server(host='localhost', debug=True)

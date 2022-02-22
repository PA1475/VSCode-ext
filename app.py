from time import time
import dash
import os
from datetime import datetime, timedelta, date
import numpy as np
import dash_core_components as dcc
import dash_html_components as html
from dash.dependencies import Input, Output
import plotly.express as px
import pandas as pd
import dash_bootstrap_components as dbc
from Sensors.e4 import E4Wristband
from Sensors.eye_tracker import EyeTracker
from Sensors.e4 import E4Wristband

app = dash.Dash(__name__, external_stylesheets=[dbc.themes.BOOTSTRAP])

eye_tracker = EyeTracker()
e4 = E4Wristband()


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
            id='e4_LineGraph'
        )
    ]
)


graph_card3 = dbc.Card(
    [
        dcc.Graph(
            id='eye_tracker_heatmap')
    ]
)


range_slider = dcc.RangeSlider(0, 24, id='range_slider', value=[0, 23], step=0.2, marks={
        0: '00:00',
        2: '02:00',
        4: '04:00',
        6: '06:00',
        8: '08:00',
        10: '10:00',
        12: '12:00',
        14: '14:00',
        16: '16:00',
        18: '18:00',
        20: '20:00',
        22: '22:00',
    }
            
)


# the layout
app.layout = html.Div(
    [
        html.H1(children='Emotion Aware Dashboard'),
        
        html.Hr(),
        dcc.DatePickerSingle(id='datepicker', date=date(2022, 1, 27)), 
        html.Hr(),
        dbc.Row(dbc.Col(range_slider, width=10, align='center')),
        html.H2('Eyetracker'),
        dbc.Row([dbc.Col(graph_card, width=5), dbc.Col(graph_card3, width=5)], justify="center"),

        html.H2('Now for the E4 visualization! Use the tools below to customize your graph.'),
        dbc.Row(
            [
                dbc.Col(
                    [
                        html.P('Select data type'),
                        dcc.Dropdown(["EDA", "HR", "BVP"], "EDA", id='data_type_DD')
                    ]
                )
            ]
        ),
        html.H4(id = 'e4_head',children=''),
        dbc.Row(dbc.Col([graph_card2], align='center', width="auto") , justify="center")

    ], style={'textAlign': 'center'}
)


@app.callback(
        Output('eye_tracking_visualization', 'figure'),
        Input('datepicker', 'date'),
        Input('range_slider', 'value'))
def update_eyetracker_scatterfig(date, time_range):
    date = datetime.strptime(date, '%Y-%m-%d').date()
    return eye_tracker.fig(date, time_range)


@app.callback(
        Output('eye_tracker_heatmap', 'figure'),
        Input('datepicker', 'date'),
        Input('range_slider', 'value'))
def update_eyetracker_heatmap(date, time_range):
    date = datetime.strptime(date, '%Y-%m-%d').date()
    return eye_tracker.heat_map(date, time_range)


@app.callback(
    Output('e4_LineGraph', 'figure'),
    Input('data_type_DD', 'value'),
    Input('datepicker', 'date'),
    Input('range_slider', 'value'))
def update_e4_LineGraph(data_type, date, time_range):
    date = datetime.strptime(date, '%Y-%m-%d').date()
    return e4.fig(data_type, date, time_range)

@app.callback(
    Output('e4_head', 'children'),
    Input('data_type_DD', 'value'),
    Input('datepicker', 'date'),
    Input('range_slider', 'value'))
def update_e4_summary(data_type, date, time_range):
    date = datetime.strptime(date, '%Y-%m-%d').date()
    return e4.card(data_type, date, time_range)

if __name__ == '__main__':
    app.run_server(host='localhost', debug=True)

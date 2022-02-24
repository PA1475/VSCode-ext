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

jumbotronRow = dbc.Row(
            dbc.Container(
                [
                    html.H1("Emotional Aware Dashboard"),
                    html.P("Explore your data from the E4 wristband, eyetracker and EEG headset")
                ]
            ),
            className="text-white h-200 bg-dark",
            style={
                'padding' : 20,
                'textAlign': 'center'
            }
        )

E4description = "The E4 wirstband measures both heartrate, sweat and BVP. Heartrate is the number of beats per minute. The heartrate tends to up when your stressed. The same is true for sweat."
E4_DATA_TYPES = ["EDA", "HR", "BVP"]
E4_counter = 0

date_picker_bar = html.Div(
    html.Div(
        children=[
                    html.H4('Select a timeframe', style={'margin': 'auto', 'margin-right':20}),
                    html.P('Date:', style={'margin':'auto'}),
                    dcc.DatePickerSingle(id='datepicker', date=date(2022, 2, 9), style={'background-color':'red', 'border-radius':10}),
                    html.P('Start time:', style={'margin':'auto'}),
                    dcc.Dropdown(['08:00', '10:00'], '08:00', id='start', style={'width':100}),
                    html.P('End time:', style={'margin':'auto'}),
                    dcc.Dropdown(['08:00', '10:00'], '08:00', id='end', style={'width':100}),
                ], style={'width':'fit-content',
                      'display':'grid',
                      'gap':20,
                      'grid-auto-flow':'column',
                      'align-items':'center',
                      'vertical-align':'center',
                      'margin':'0 auto',
                      'background': '#F4F4F4',
                      'border-radius':10,
                      'padding':10,
                      'padding-right':30,
                      'padding-left':30}
                ), style={'justify-content':'center', 'width':'auto', 'padding-bottom' : 40}
)

E4ColumnPicker = dbc.Col(
    [
        html.Div(
            html.H2("E4 Wristband"),
            style={
                'textAlign': 'center',
                'padding' : 10
                }
        ),
        html.Div(
            dbc.Card(
                [
                    dbc.CardBody(
                        [
                            html.H4("Select datasource", className="card-title"),
                            dcc.Dropdown(options=[{'label' : 'Heart rate', 'value' : 'HR'},{'label' : 'EDA', 'value' : 'EDA'}, {'label':'Blood Volume Pulse','value':'BVP'}], value="HR", id='e4dropdown', style={'width':200})
                        ]
                    )
                ],
                color="light"
            )
        ),
        html.Div(
            [
                html.Div(
                    html.P(E4description)
                ),
                html.P("BVP stands for blood volume pulse and bla bla lba.")
            ],
            style={
                'padding' : 5
            }
        )
    ],
    width=3,
    style={
        'padding' : 30,
        "width" : "24rem"
    }
)

E4Graph = dbc.Col(
    [graph_card2]
    , align='center',
    width=6
)
# the layout
app.layout = html.Div(
    [
        jumbotronRow,
        html.Div(
            children=[
                date_picker_bar,
                dbc.Row(
                [
                    E4ColumnPicker,
                    E4Graph,
                ]
                )
            ]
        ,
        style= {'padding' : 100}
        ),
        html.H2('Eyetracker'),
        dbc.Row([dbc.Col(graph_card, width=5), dbc.Col(graph_card3, width=5)], justify="center")
    ]
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
    print(time_range)
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

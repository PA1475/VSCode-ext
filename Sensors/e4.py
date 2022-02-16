import pandas as pd
import plotly.express as px

def get_e4_bvp(path):
    ''' read ey temp data from specified path '''

    df = pd.read_csv(path)
    time = list(df)[0]
    hz = df[time][0]

    df['timestamp'] = [(float(time)+item/hz) for item in range(-1, len(df.index)-1)]
    df = df.iloc[1:]
    fig = px.line(df, x='timestamp', y=time)

    return fig

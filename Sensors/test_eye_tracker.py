from eye_tracker import EyeTracker
from datetime import date
import plotly.express as px

eye_tracker = EyeTracker()
fig = eye_tracker.fig(date(2022, 1, 27))
fig.show()

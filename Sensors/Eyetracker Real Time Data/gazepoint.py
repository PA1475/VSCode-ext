import time
import threading

from tools import OpenGazeTracker


class GazePoint(threading.Thread):
    def __init__(self, ip='127.0.0.1', port=4242):
        threading.Thread.__init__(self)
        self.daemon = True
        self.interrupted = threading.Lock()

        self.gaze_position = (None, None)

        self.open(ip, port)
        self.start()
        self.wait_until_running()

    def get_gaze_position(self):
        return self.gaze_position

    def run(self):
        self.interrupted.acquire()
        while self.interrupted.locked():
            self.gaze_position = self.tracker.sample()

    def stop(self):
        self.interrupted.release()
        self.close()

    def open(self, ip, port):
        print('Setting Up Gaze Point device, this takes about 58.5 seconds')
        self.tracker = OpenGazeTracker(ip=ip, port=port)
        self.tracker.calibrate()
        self.tracker.enable_send_data(True)

    def close(self):
        print('Closing connection to Gaze Point device, this takes about 5 seconds')
        self.tracker.enable_send_data(False)
        self.tracker.close()

    def __del__(self):
        self.close()

    def __exit__(self, exc_type, exc_value, traceback):
        self.close()

    def wait_until_running(self, sleep_time=0.01):
        while not self.interrupted.locked():
            time.sleep(sleep_time)


if __name__ == '__main__':
    gazetracker = GazePoint()  

    xcoords = []
    ycoords = []
    avg_x = []
    counter = 0
    start = time.time()
    while time.time() - start < 30:
        counter += 1
        coordinate = gazetracker.get_gaze_position()
        if counter % 30 == 0:
            print(counter)
            if coordinate[0] is not None: 
                xcoords.append(coordinate[0])
            if coordinate[1] is not None: 
                ycoords.append(coordinate[1])
            if len(xcoords) != 0:
                avg_x.append(sum(xcoords)/len(xcoords))
            #print("X:",coordinate[0],"Y:",coordinate[1])
    print(len(xcoords))
    gazetracker.stop()
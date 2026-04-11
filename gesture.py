import cv2
import mediapipe as mp
import pyautogui
import math
from enum import IntEnum
from ctypes import cast, POINTER
from comtypes import CLSCTX_ALL
from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume
from google.protobuf.json_format import MessageToDict

pyautogui.FAILSAFE = False
mp_drawing = mp.solutions.drawing_utils
mp_hands = mp.solutions.hands

# Gesture Encodings 
class Gest(IntEnum):
    FIST = 0
    PINKY = 1
    RING = 2
    MID = 4
    LAST3 = 7
    INDEX = 8
    FIRST2 = 12
    LAST4 = 15
    THUMB = 16    
    PALM = 31
    
    V_GEST = 33
    TWO_FINGER_CLOSED = 34
    PINCH_MAJOR = 35
    PINCH_MINOR = 36

class HLabel(IntEnum):
    MINOR = 0
    MAJOR = 1

class HandRecog:
    def __init__(self, hand_label):
        self.finger = 0
        self.ori_gesture = Gest.PALM
        self.prev_gesture = Gest.PALM
        self.frame_count = 0
        self.hand_result = None
        self.hand_label = hand_label
    
    def update_hand_result(self, hand_result):
        self.hand_result = hand_result

    def get_signed_dist(self, point):
        sign = -1
        if self.hand_result.landmark[point[0]].y < self.hand_result.landmark[point[1]].y:
            sign = 1
        dist = (self.hand_result.landmark[point[0]].x - self.hand_result.landmark[point[1]].x)**2
        dist += (self.hand_result.landmark[point[0]].y - self.hand_result.landmark[point[1]].y)**2
        return math.sqrt(dist)*sign
    
    def get_dist(self, point):
        dist = (self.hand_result.landmark[point[0]].x - self.hand_result.landmark[point[1]].x)**2
        dist += (self.hand_result.landmark[point[0]].y - self.hand_result.landmark[point[1]].y)**2
        return math.sqrt(dist)
    
    def get_dz(self,point):
        return abs(self.hand_result.landmark[point[0]].z - self.hand_result.landmark[point[1]].z)
    
    def set_finger_state(self):
        if self.hand_result is None:
            return

        points = [[8,5,0],[12,9,0],[16,13,0],[20,17,0]]
        self.finger = 0

        for idx,point in enumerate(points):
            dist = self.get_signed_dist(point[:2])
            dist2 = self.get_signed_dist(point[1:])
            
            try:
                ratio = round(dist/dist2,1)
            except:
                ratio = 0

            self.finger = self.finger << 1
            if ratio > 0.5:
                self.finger = self.finger | 1

    def get_gesture(self):
        if self.hand_result is None:
            return Gest.PALM

        current_gesture = Gest.PALM

        if self.finger in [Gest.LAST3,Gest.LAST4] and self.get_dist([8,4]) < 0.05:
            current_gesture = Gest.PINCH_MAJOR

        elif Gest.FIRST2 == self.finger:
            dist1 = self.get_dist([8,12])
            dist2 = self.get_dist([5,9])
            ratio = dist1/dist2

            if ratio > 1.7:
                current_gesture = Gest.V_GEST
            else:
                if self.get_dz([8,12]) < 0.1:
                    current_gesture =  Gest.TWO_FINGER_CLOSED
                else:
                    current_gesture =  Gest.MID
        else:
            current_gesture = self.finger
        
        if current_gesture == self.prev_gesture:
            self.frame_count += 1
        else:
            self.frame_count = 0

        self.prev_gesture = current_gesture

        if self.frame_count > 4:
            self.ori_gesture = current_gesture

        return self.ori_gesture


class Controller:
    prev_hand = None
    pinchstartxcoord = None
    pinchstartycoord = None
    pinchlv = 0
    prevpinchlv = 0
    framecount = 0
    pinchdirectionflag = None
    pinch_threshold = 0.3

    def getpinchylv(hand_result):
        return round((Controller.pinchstartycoord - hand_result.landmark[8].y)*10,1)

    def changesystemvolume():
        devices = AudioUtilities.GetSpeakers()
        interface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
        volume = cast(interface, POINTER(IAudioEndpointVolume))
        currentVolumeLv = volume.GetMasterVolumeLevelScalar()
        currentVolumeLv += Controller.pinchlv/50.0
        currentVolumeLv = max(0.0, min(1.0, currentVolumeLv))
        volume.SetMasterVolumeLevelScalar(currentVolumeLv, None)

    def scrollVertical():
        pyautogui.scroll(120 if Controller.pinchlv>0 else -120)

    def get_position(hand_result):
        x = int(hand_result.landmark[9].x * pyautogui.size()[0])
        y = int(hand_result.landmark[9].y * pyautogui.size()[1])
        return (x, y)

    def pinch_control_init(hand_result):
        Controller.pinchstartycoord = hand_result.landmark[8].y
        Controller.prevpinchlv = 0

    def pinch_control(hand_result):
        Controller.pinchlv = Controller.getpinchylv(hand_result)
        Controller.changesystemvolume()

    def handle_controls(gesture, hand_result):
        if gesture == Gest.V_GEST:
            x,y = Controller.get_position(hand_result)
            pyautogui.moveTo(x, y)

        elif gesture == Gest.FIST:
            pyautogui.mouseDown()
            x,y = Controller.get_position(hand_result)
            pyautogui.moveTo(x, y)

        elif gesture == Gest.MID:
            pyautogui.click()

        elif gesture == Gest.INDEX:
            pyautogui.rightClick()

        elif gesture == Gest.TWO_FINGER_CLOSED:
            pyautogui.doubleClick()

        elif gesture == Gest.PINCH_MAJOR:
            Controller.pinch_control(hand_result)


class GestureController:
    def __init__(self):
        self.cap = cv2.VideoCapture(0)

    def start(self):
        hand = HandRecog(HLabel.MAJOR)

        with mp_hands.Hands(max_num_hands=1) as hands:
            while self.cap.isOpened():
                success, image = self.cap.read()
                if not success:
                    continue

                image = cv2.flip(image, 1)
                rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                results = hands.process(rgb)

                if results.multi_hand_landmarks:
                    hand.update_hand_result(results.multi_hand_landmarks[0])
                    hand.set_finger_state()
                    gesture = hand.get_gesture()
                    Controller.handle_controls(gesture, hand.hand_result)

                    for lm in results.multi_hand_landmarks:
                        mp_drawing.draw_landmarks(image, lm, mp_hands.HAND_CONNECTIONS)

                cv2.imshow("Gesture Control", image)

                if cv2.waitKey(1) & 0xFF == 27:
                    break

        self.cap.release()
        cv2.destroyAllWindows()


gc = GestureController()
gc.start()

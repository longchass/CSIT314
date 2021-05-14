from keras_retinanet.utils.image import preprocess_image, read_image_bgr, preprocess_image, resize_image
from keras_retinanet.utils.image import read_image_bgr
from keras_retinanet.utils.image import resize_image
from keras_retinanet import models
from keras_retinanet.utils.visualization import draw_box, draw_caption
from keras_retinanet.utils.colors import label_color
import tensorflow
import numpy as np
import os
import cv2
import urllib
import datetime
from flask import Flask, abort, jsonify, request
from flask_cors import CORS, cross_origin
from PIL import Image
import tensorflow as tf
config = tf.compat.v1.ConfigProto(gpu_options = 
                         tf.compat.v1.GPUOptions(per_process_gpu_memory_fraction=0.5)
# device_count = {'GPU': 1}
)
config.gpu_options.allow_growth = True
session = tf.compat.v1.Session(config=config)
tf.compat.v1.keras.backend.set_session(session)
app = Flask(__name__, static_folder='outputs')
cors = CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'

CONFIG = {
    "model_path":"./models/plate-recognition.h5",
    "faulty_model_path":"./models/faulty-plate-recognition.h5",
    "confidence":0.6,
    "labels_path":"classes.csv",
    "default_image_download_path":"outputs/prediction.jpeg"
}
THRES_SCORE = 0.6

# load the class label mappings
LABELS = open(CONFIG.get("labels_path")).read().strip().split('\n')
LABELS = {int(L.split(",")[1]): L.split(",")[0] for L in LABELS}

# load the model from disk and grab all input image paths
model = models.load_model(CONFIG.get("model_path"), backbone_name='resnet50')
model = models.convert_model(model)

faulty_model = models.load_model(CONFIG.get("faulty_model_path"), backbone_name='resnet50')
faulty_model = models.convert_model(faulty_model)

def draw_detections(image, boxes, scores, labels):
    global LABELS
    for box, score, label in zip(boxes[0], scores[0], labels[0]):
        if score < THRES_SCORE:
            break

        color = label_color(label)

        b = box.astype(int)
        draw_box(image, b, color=color)

        caption = "{} {:.3f}".format(LABELS[label], score)
        draw_caption(image, b, caption)

def save_prediction(imagePath, savePath, boxes, scores, labels):
    draw = cv2.imread(imagePath)
    draw_detections(draw, boxes, scores, labels)
    result = cv2.imwrite(savePath, draw)

def detect_plate(image_url, is_faulty=False):
    if not os.path.exists('outputs'):
        os.makedirs('outputs')

    img = urllib.request.urlopen(image_url)
    img = Image.open(img)
    img = img.convert('RGB')
    img.save(CONFIG["default_image_download_path"], "JPEG")

    image = read_image_bgr(CONFIG["default_image_download_path"])
    image = preprocess_image(image)
    (image, scale) = resize_image(image)
    image = np.expand_dims(image, axis=0)

    boxes, scores, labels = faulty_model.predict_on_batch(image) if is_faulty == True else model.predict_on_batch(image)
    boxes /= scale

    curr_time = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
    save_file_path = f"outputs/pred_{curr_time}.png"
    save_prediction(CONFIG["default_image_download_path"], save_file_path, boxes, scores, labels)

    object_detected = []
    # Loop over the detections
    for (box, score, label) in zip(boxes[0], scores[0], labels[0]):
        # Filter out weak detections
        if score < CONFIG["confidence"]:
            continue
        box = box.astype("int")
        object_detected.append({
            "label":LABELS[label],
            "score":str(score),
            "coord":{
                "y_min":str(box[1]),
                "x_min":str(box[0]),
                "y_max":str(box[3]),
                "x_max":str(box[2])
            }
        })

    return object_detected, save_file_path

@app.route("/predict", methods=['POST'])
@cross_origin()
def predict():
    data = request.get_json()
    image_path = data["image_path"]
    object_detected, save_file_path = detect_plate(image_path, False)
    base_url = request.base_url.replace("/predict","")

    return jsonify({
        "result": "success",
        "result_url":f"{base_url}/{save_file_path}",
        "object_detected":object_detected
    })

@app.route("/predict-faulty", methods=['POST'])
@cross_origin()
def predict_faulty():
    data = request.get_json()
    image_path = data["image_path"]
    object_detected, save_file_path = detect_plate(image_path, True)
    base_url = request.base_url.replace("/predict-faulty","")

    return jsonify({
        "result": "success",
        "result_url":f"{base_url}/{save_file_path}",
        "object_detected":object_detected
    })
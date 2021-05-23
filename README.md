# CSIT314
## Abstract
a simple program to automatic test of [keras tensorflow models](https://github.com/tensorflow/tensorflow/tree/master/tensorflow/python/keras):
an extention upon the idea of [FSCS ART vs RT](https://github.com/longchass/CSIT318-ART-vs-RT) shown on
this paper: https://www.sciencedirect.com/science/article/abs/pii/S0164121209000405
## How to run


download two models one with seeded error and one is normal 
 
seeded error
https://drive.google.com/file/d/1-V_nK9en33oHJmlSd-BFpU9c82ZE8OUo/view?usp=sharing , 

no seeded error
https://drive.google.com/file/d/1QyeAHTAzuHBjFEvvKI31jmC3x-f3JVES/view?usp=sharing

and put it into /Object detection server/models

Preparation
cd into /ART vs RT server/ass2/angular/
type "npm start" into console and run
uses npm (requires npm)

the front-end server now will be hosted on http://localhost:4200/

cd into /Object detection server/

//install opencv2
pip install opencv-python


python wsgi.py

the back-end server should be listening for incoming pictures link on http://localhost:5000/

feed the .csv or .xsls that includes metadata of pictures in the categories that you have trained for your models. (sample.xlsx uses license plates)

beside displaying on the front end the outputs picture with bounding box and confidence level will also be saved to \Object detection server\outputs

![gif of the program running](https://github.com/longchass/images/blob/master/artvsrt.gif)

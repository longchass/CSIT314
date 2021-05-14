FROM python:3.6-slim
RUN apt-get update -y
RUN apt-get install -y build-essential libgl1-mesa-glx libglib2.0-0
COPY . /app
WORKDIR /app
RUN pip install .
RUN pip install -r req.txt
RUN python setup.py build_ext --inplace
CMD [ "python" , "wsgi.py" ]
FROM node:20.2.0-alpine3.17
EXPOSE 3000
COPY . /app
WORKDIR /app
CMD ['npm', 'start']

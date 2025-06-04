FROM nginx:1.28.0-alpine3.21
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY public/. /usr/share/nginx/html/.

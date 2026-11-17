FROM nginx:alpine

LABEL org.opencontainers.image.title="拾知 · 知识点手记" \
      org.opencontainers.image.description="A local-first knowledge notes web app." \
      org.opencontainers.image.version="1.0.0"

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html styles.css app.js api.js favicon.svg /usr/share/nginx/html/

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

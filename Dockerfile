FROM python:3-alpine
WORKDIR /app
COPY . .
ENV SAFE_HOST=0.0.0.0 \
    SAFE_PORT=8787 \
    SAFE_OPEN_BROWSER=0
EXPOSE 8787
CMD ["python", "servidor_safe.py"]

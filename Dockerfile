FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt && groupadd --gid 10001 safe && useradd --uid 10001 --gid safe --no-create-home safe && mkdir /data && chown safe:safe /data
COPY safe_access.py access.js password.html password.js users.html users.js servidor_safe.py index.html app.js technical.js pdf.js theme.js planner-document.js planner-integration.js styles.css dark-theme.css planner-integration.css login.html login.js auth.css safe-server.js cctv.html cctv.js ./
COPY assets/ ./assets/
ENV SAFE_HOST=0.0.0.0 SAFE_PORT=8787 SAFE_DATA_DIR=/data/state PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
USER safe
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=4s --start-period=10s --retries=3 CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8787/healthz', timeout=3)"]
CMD ["python", "servidor_safe.py"]

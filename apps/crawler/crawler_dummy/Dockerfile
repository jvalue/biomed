FROM python:3.14-slim

WORKDIR /app

# Install uv (pinned)
RUN pip install --upgrade pip \
    && pip install "uv==0.9.13"

# Copy app
COPY apps/crawler/crawler_dummy ./crawler_dummy

# Install app
RUN uv pip install --system ./crawler_dummy

# Run the app
CMD ["python", "-m", "src.main"]

FROM python:3.14-slim

WORKDIR /app

# Install uv (pinned)
RUN pip install --upgrade pip \
    && pip install "uv==0.9.13"

# Copy only necessary files
COPY libs/crawler-common ./libs/crawler-common
COPY apps/crawler/crawler_dummy ./crawler_dummy

# Install crawler-common first, then app
RUN uv pip install --system ./libs/crawler-common \
    && uv pip install --system ./crawler_dummy

# Run the app
CMD ["python", "crawler_dummy/src/main.py"]

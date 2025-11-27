FROM python:3.14-slim

WORKDIR /app

# Install uv
RUN pip install --upgrade pip \
    && pip install uv

COPY pyproject.toml ./
# Copy app code, but exclude .venv
COPY crawler_general ./crawler_general


# Compile requirements and install with uv
RUN uv pip compile pyproject.toml -o requirements.txt \
    && uv pip install --system -r requirements.txt

# Run the app with uv
CMD ["uv", "run", "crawler_general/hello.py"]

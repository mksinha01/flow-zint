FROM python:3.12-slim

WORKDIR /app

# Install system dependencies if required by any python packages
# RUN apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Environment variables
ENV PYTHONUNBUFFERED=1

# Command to run the agent
CMD ["python", "src/agents/sales_caller.py", "start"]

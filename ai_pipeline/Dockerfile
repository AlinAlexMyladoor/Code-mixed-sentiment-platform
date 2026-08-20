FROM nvidia/cuda:12.1.1-devel-ubuntu22.04

# Set non-interactive to avoid timezone prompts during apt installs
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    git \
    && rm -rf /var/lib/apt/lists/*

# Alias python to python3
RUN ln -s /usr/bin/python3 /usr/bin/python

# Set working directory
WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Install bitsandbytes from source (or precompiled if it works out of the box, but typically pip install is fine on this image)
RUN pip3 install bitsandbytes uvicorn fastapi python-dotenv python-multipart

# Copy the rest of the application
COPY . .

# Expose port (Cloud Run defaults to 8080)
EXPOSE 8080

# Run the inference server
CMD ["uvicorn", "inference_server:app", "--host", "0.0.0.0", "--port", "8080"]

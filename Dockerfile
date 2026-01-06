# ----------------------------------------------------------
# 1. FRONTEND BUILD STAGE
# ----------------------------------------------------------
FROM node:20-slim AS build

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --prefer-offline --no-audit --progress=false

COPY public ./public
COPY *.js ./

# Build frontend only
RUN npm run build


# ----------------------------------------------------------
# 2. PRODUCTION STAGE - OPTIMIZED
# ----------------------------------------------------------
FROM rocker/r-ver:4.5.1 AS production
ENV NODE_ENV=production \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /usr/src/app

# ----------------------------------------------------------
# Install all system dependencies + Python 3.10 + Node 20 in ONE layer
# ----------------------------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget curl ca-certificates gnupg \
    build-essential pkg-config make g++ gosu \
    # Python build dependencies
    libssl-dev libffi-dev zlib1g-dev libbz2-dev libreadline-dev \
    libsqlite3-dev liblzma-dev libncurses5-dev libgdbm-dev libnss3-dev \
    # R and graphics dependencies
    libxml2-dev libcurl4-openssl-dev libgit2-dev \
    libfontconfig1-dev libcairo2-dev libxt-dev \
    libjpeg-dev libpng-dev libtiff5-dev libfreetype6-dev libwebp-dev \
    libharfbuzz-dev libfribidi-dev fonts-dejavu \
    # Install Node 20
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    # Build Python 3.10 from source with optimizations
    && wget -q https://www.python.org/ftp/python/3.10.12/Python-3.10.12.tgz \
    && tar -xzf Python-3.10.12.tgz \
    && cd Python-3.10.12 \
    && ./configure \
    --enable-optimizations \
    --with-lto \
    --enable-shared \
    --without-ensurepip \
    && make -j"$(nproc)" \
    && make altinstall \
    && ldconfig \
    && cd .. \
    && rm -rf Python-3.10.12 Python-3.10.12.tgz \
    # Create symlinks for python3.10
    && ln -sf /usr/local/bin/python3.10 /usr/bin/python3 \
    && ln -sf /usr/local/bin/python3.10 /usr/bin/python \
    # Install pip
    && curl -sS https://bootstrap.pypa.io/get-pip.py | python3 \
    # Clean up build dependencies we don't need at runtime (keep libs needed by R packages)
    && apt-get remove -y wget gnupg \
    && apt-get autoremove -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /tmp/* /var/tmp/* \
    && rm -rf /root/.cache

# ----------------------------------------------------------
# Install R packages with cleanup
# ----------------------------------------------------------
RUN R -e "install.packages(c(\
    'tidyverse','compositions','glmnet','readxl','lubridate',\
    'openxlsx','forecast','zoo','scales','showtext','bsts',\
    'systemfonts','jsonlite','lme4','pbkrtest','ragg','car'\
    ), repos='https://cloud.r-project.org/', dependencies=TRUE, Ncpus=4)" \
    # Clean R package build artifacts
    && rm -rf /tmp/downloaded_packages/* \
    && rm -rf /tmp/*.rds

# Install ggiraph separately with explicit error checking
RUN R -e "install.packages('remotes', repos='https://cloud.r-project.org/')" \
    && R -e "remotes::install_version('ggiraph', version='0.8.13', repos='https://cloud.r-project.org/')" \
    && R -e "if (!require('ggiraph')) { stop('ggiraph installation failed') }" \
    # Clean up
    && rm -rf /tmp/downloaded_packages/* \
    && rm -rf /tmp/*.rds \
    && strip /usr/local/lib/R/site-library/*/libs/*.so 2>/dev/null || true

# ----------------------------------------------------------
# Install Python packages
# ----------------------------------------------------------
COPY requirements.txt .
RUN pip install --no-cache-dir \
    plotly==5.24.1 \
    pandas polars pyarrow fastexcel \
    && rm -rf /root/.cache/pip \
    && find /usr/local/lib/python3.10 -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true \
    && find /usr/local/lib/python3.10 -type f -name '*.pyc' -delete \
    && find /usr/local/lib/python3.10 -type f -name '*.pyo' -delete

# ----------------------------------------------------------
# Install Node.js production dependencies only
# ----------------------------------------------------------
COPY package*.json ./
RUN npm ci --only=production --prefer-offline --no-audit --progress=false \
    && npm cache clean --force

# ----------------------------------------------------------
# Copy application files (selective, not everything)
# ----------------------------------------------------------
# Copy built frontend from build stage
COPY --from=build /usr/src/app/public/dist ./public/dist

# Copy only necessary application files
COPY server.js knexfile.js ./
COPY config ./config
COPY controllers ./controllers
COPY middlewares ./middlewares
COPY routes ./routes
COPY utils ./utils
COPY views ./views
COPY public ./public
COPY scripts ./scripts
COPY services ./services
COPY migrations ./migrations
COPY seeds ./seeds

# ----------------------------------------------------------
# Add entrypoint and setup user
# ----------------------------------------------------------
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh \
    && useradd -m -u 1005 appuser \
    && mkdir -p /usr/src/app/logs /usr/src/app/uploads /usr/src/app/temp-uploads /usr/src/app/AboveMarketFiles \
    && chown -R appuser:appuser /usr/src/app



ENTRYPOINT ["/entrypoint.sh"]
EXPOSE 3000
CMD ["node", "server.js"]

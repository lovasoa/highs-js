# check=skip=InvalidDefaultArgInFrom
# NODE_VARIANT deliberately has no Dockerfile default: compose.yaml requires
# the single canonical value from ../.env.

ARG NODE_VARIANT
FROM mcr.microsoft.com/devcontainers/javascript-node:${NODE_VARIANT}
ARG EMSDK_VERSION

# [Optional] Uncomment this section to install additional OS packages.
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install cmake

RUN git clone --branch "${EMSDK_VERSION}" --depth 1 https://github.com/emscripten-core/emsdk.git /emsdk && \
    sudo /emsdk/emsdk install "${EMSDK_VERSION}" && \
    sudo /emsdk/emsdk activate "${EMSDK_VERSION}" && \
    sudo ln -s /emsdk/upstream/emscripten /usr/share/emscripten && \
    chown -R node:node /emsdk

ENV PATH="$PATH:/emsdk:/emsdk/upstream/emscripten"

# Seed named dependency and build volumes with ownership matching the non-root
# user. Docker copies these directory owners into newly created volumes.
RUN mkdir -p /work/node_modules /work/build && chown -R node:node /work

# [Optional] Uncomment if you want to install an additional version of node using nvm
# ARG EXTRA_NODE_VERSION=10
# RUN su node -c "source /usr/local/share/nvm/nvm.sh && nvm install ${EXTRA_NODE_VERSION}"

# [Optional] Uncomment if you want to install more global node modules
# RUN su node -c "npm install -g <your-package-list-here>"

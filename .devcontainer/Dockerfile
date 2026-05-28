# See here for image contents: https://github.com/devcontainers/images/tree/main/src/javascript-node

# [Choice] Node.js version
ARG VARIANT="24-trixie"
FROM mcr.microsoft.com/devcontainers/javascript-node:${VARIANT}

# [Optional] Uncomment this section to install additional OS packages.
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install cmake

RUN git clone https://github.com/emscripten-core/emsdk.git /emsdk && \
    sudo /emsdk/emsdk install 5.0.7 && \
    sudo /emsdk/emsdk activate 5.0.7 && \
    sudo ln -s /emsdk/upstream/emscripten /usr/share/emscripten

ENV PATH="$PATH:/emsdk:/emsdk/upstream/emscripten"

# [Optional] Uncomment if you want to install an additional version of node using nvm
# ARG EXTRA_NODE_VERSION=10
# RUN su node -c "source /usr/local/share/nvm/nvm.sh && nvm install ${EXTRA_NODE_VERSION}"

# [Optional] Uncomment if you want to install more global node modules
# RUN su node -c "npm install -g <your-package-list-here>"

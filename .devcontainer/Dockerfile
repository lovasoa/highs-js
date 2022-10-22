# See here for image contents: https://github.com/microsoft/vscode-dev-containers/tree/v0.205.2/containers/javascript-node/.devcontainer/base.Dockerfile

# [Choice] Node.js version (use -bullseye variants on local arm64/Apple Silicon): 16, 14, 12, 16-bullseye, 14-bullseye, 12-bullseye, 16-buster, 14-buster, 12-buster
ARG VARIANT="16-bullseye"
FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:0-${VARIANT}

# [Optional] Uncomment this section to install additional OS packages.
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install cmake

RUN git clone https://github.com/emscripten-core/emsdk.git /emsdk && \
    sudo /emsdk/emsdk install 3.1.24 && \
    sudo /emsdk/emsdk activate 3.1.24

ENV PATH="$PATH:/emsdk:/emsdk/upstream/emscripten:/emsdk/node/14.18.2_64bit/bin"

RUN cd /emsdk/upstream/emscripten/ && sudo npm install acorn google-closure-compiler

# [Optional] Uncomment if you want to install an additional version of node using nvm
# ARG EXTRA_NODE_VERSION=10
# RUN su node -c "source /usr/local/share/nvm/nvm.sh && nvm install ${EXTRA_NODE_VERSION}"

# [Optional] Uncomment if you want to install more global node modules
# RUN su node -c "npm install -g <your-package-list-here>"

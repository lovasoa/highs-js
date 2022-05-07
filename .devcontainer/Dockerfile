# See here for image contents: https://github.com/microsoft/vscode-dev-containers/tree/v0.205.2/containers/javascript-node/.devcontainer/base.Dockerfile

# [Choice] Node.js version (use -bullseye variants on local arm64/Apple Silicon): 16, 14, 12, 16-bullseye, 14-bullseye, 12-bullseye, 16-buster, 14-buster, 12-buster
ARG VARIANT="16-bullseye"
FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:0-${VARIANT}

# [Optional] Uncomment this section to install additional OS packages.
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
     && apt-get -y install emscripten cmake

RUN emcc
RUN sudo ln -s /usr/share/emscripten/emcc.py /usr/share/emscripten/emcc && \
    sudo ln -s /usr/share/emscripten/emar.py /usr/share/emscripten/emar && \
    sudo ln -s /usr/share/emscripten/emranlib.py /usr/share/emscripten/emranlib && \
    sudo ln -s /usr/share/emscripten/em++.py /usr/share/emscripten/em++

RUN cd /usr/share/emscripten/ && sudo npm install acorn google-closure-compiler

# Remove buggy debian patch (see https://github.com/emscripten-core/emscripten/issues/15545)
RUN sudo sed -i "s/cmd = \['closure-compiler'\]/cmd = shared.get_npm_cmd('google-closure-compiler')/g" /usr/share/emscripten/tools/building.py
# see https://github.com/lovasoa/highs-js/issues/14
RUN sudo sed -i "s/ECMASCRIPT_NEXT_IN/ECMASCRIPT_2020/g" /usr/share/emscripten/tools/building.py

# [Optional] Uncomment if you want to install an additional version of node using nvm
# ARG EXTRA_NODE_VERSION=10
# RUN su node -c "source /usr/local/share/nvm/nvm.sh && nvm install ${EXTRA_NODE_VERSION}"

# [Optional] Uncomment if you want to install more global node modules
# RUN su node -c "npm install -g <your-package-list-here>"

FROM ubuntu:20.04

ARG USERNAME=user
ARG HOME=/home/$USERNAME
ARG GROUPNAME=user
ARG UID=1000
ARG GID=1000
ARG SHELL=/bin/bash
ARG SHELLRC=$HOME/.bashrc
ARG TIMEZONE=Europe/Brussels

RUN set -x && groupadd -g $GID $GROUPNAME && useradd -m -s $SHELL -u $UID -g $GID -d $HOME $USERNAME
RUN set -x && ln -snf /usr/share/zoneinfo/$TIMEZONE /etc/localtime
RUN set -x && apt-get update && apt-get -y install pipx gdb python3-venv
WORKDIR $HOME
USER $USERNAME
RUN set -x && echo 'PATH="~/.local/bin:$PATH"' >> $SHELLRC && export PATH="$HOME/.local/bin:$PATH" && pipx install gdbgui

CMD $HOME/.local/bin/gdbgui -r

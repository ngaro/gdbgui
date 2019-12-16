import fcntl
import pty
import select
import struct
import subprocess
import termios
import tty
from typing import List, Optional
import os
import logging


class Pty:
    max_read_bytes = 1024 * 20

    def __init__(self, command: Optional[List[str]]=None):
        self.command = command
        if command:
            (child_pid, child_pty_fd) = pty.fork()
            if child_pid == 0:
                # this is the child process pty, where we run a command
                subprocess.run(command, bufsize=0)
            else:
                # this is the parent process fork, where we can programatically
                # interact with the child pty via its file descriptor
                self.stdout = child_pty_fd
                self.stdin = child_pty_fd
                self.name = os.ttyname(child_pty_fd)
        else:
            # create a new pty (but don't run anything)
            (master, slave) = pty.openpty()
            # leave in default "cooked" mode and do NOT switch to raw
            self.stdin = master
            self.stdout = master
            self.name = os.ttyname(slave)

    def set_winsize(self, rows: int, cols: int):
        xpix = 0
        ypix = 0
        winsize = struct.pack("HHHH", rows, cols, xpix, ypix)
        if self.stdin is None:
            raise RuntimeError("fd not assigned")
        fcntl.ioctl(self.stdin, termios.TIOCSWINSZ, winsize)

    def read(self) -> Optional[str]:
        if self.stdout is None:
            return "done"
        timeout_sec = 0
        (data_ready, _, _) = select.select([self.stdout], [], [], timeout_sec)
        if data_ready:
            try:
                response = os.read(self.stdout, self.max_read_bytes).decode()
            except OSError:
                logging.error(f"Failed to read from pty {self.name}", exc_info=True)
            #     self.stdout = None
            # if response == "":
            #     self.stdout = None
            return response
        return None

    def write(self, data: str):
        if self.stdin:
            os.write(self.stdin, data.encode())

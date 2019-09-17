import fcntl
import pty
import select
import struct
import subprocess
import termios
from typing import List, Optional
import os


class Pty:
    max_read_bytes = 1024 * 20

    def __init__(self, command: List[str]):
        self.command = command
        # create child process attached to a pty we can read from and write to
        (child_pid, fd) = pty.fork()
        if child_pid == 0:
            # this is the child process fork.
            # anything printed here will show up in the pty, including the output
            # of this subprocess
            subprocess.run(command)
        else:
            # this is the parent process fork.
            # store child fd and pid
            self.fd = fd
            self.child_pid = child_pid

    def set_winsize(self, rows: int, cols: int):
        xpix = 0
        ypix = 0
        winsize = struct.pack("HHHH", rows, cols, xpix, ypix)
        fcntl.ioctl(self.fd, termios.TIOCSWINSZ, winsize)

    def read(self) -> Optional[str]:
        timeout_sec = 0
        (data_ready, _, _) = select.select([self.fd], [], [], timeout_sec)
        if data_ready:
            return os.read(self.fd, self.max_read_bytes).decode()
        return None

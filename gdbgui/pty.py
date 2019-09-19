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

    def __init__(self, command: List[str], i: str):
        self.command = command
        # create child process attached to a pty we can read from and write to
        (child_pid, fd) = pty.fork()
        if child_pid == 0:
            # this is the child process fork.
            # anything printed here will show up in the pty, including the output
            # of this subprocess
            print("starting subprocess")
            subprocess.run(
                f"echo new-ui mi2 `tty` > /tmp/gdbguitty{i}.txt",
                shell=True,
                env={"PS1": ""},
            )
            print("cat complete, now running command")
            subprocess.run(command, env={"PS1": ""})
            print("finshed...")
            # os.execvpe(command[0], command[0:], {"PS1": ""})
        else:
            # this is the parent process fork.
            # store child fd and pid
            self.fd: Optional[int] = fd
            self.child_pid = child_pid

    def set_winsize(self, rows: int, cols: int):
        xpix = 0
        ypix = 0
        winsize = struct.pack("HHHH", rows, cols, xpix, ypix)
        if self.fd is None:
            raise RuntimeError("fd not assigned")
        fcntl.ioctl(self.fd, termios.TIOCSWINSZ, winsize)

    def read(self) -> Optional[str]:
        if self.fd is None:
            return "done"
        timeout_sec = 0
        (data_ready, _, _) = select.select([self.fd], [], [], timeout_sec)
        if data_ready:
            try:
                response = os.read(self.fd, self.max_read_bytes).decode()
            except OSError:
                self.fd = None
            if response == "":
                self.fd = None
            return response
        return None

    def write(self, data: str):
        if self.fd:
            os.write(self.fd, data.encode())

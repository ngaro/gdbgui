import logging
import traceback
from typing import Any, Dict, List, Optional
from pygdbmi.IoManager import IoManager
from collections import defaultdict
from .ptylib import Pty
import os

logger = logging.getLogger(__name__)


class DebugSession:
    def __init__(
        self,
        *,
        pygdbmi_controller: IoManager,
        pty_machine_interface: Pty,
        pty_for_user: Pty,
        pty_for_debugged_program: Pty,
        command: str,
        mi_version: str,
        pid: int,
    ):
        self.command = command
        self.pygdbmi_controller = pygdbmi_controller
        self.pty_machine_interface = pty_machine_interface
        self.pty_for_user = pty_for_user
        self.pty_for_debugged_program = pty_for_debugged_program
        self.mi_version = mi_version
        self.pid = pid

    def terminate(self):
        if self.pid:
            os.kill(self.pid)
        logger.error("TODO kill reader")


class StateManager(object):
    def __init__(self, app_config: Dict[str, Any]):
        self.debug_session_to_client_ids: Dict[DebugSession, List[str]] = defaultdict(
            list
        )  # key is controller, val is list of client ids

        self.gdb_reader_thread = None
        self.config = app_config

    def connect_client(
        self, client_id: str, desired_gdbpid: int, gdb_command: str, mi_version: str
    ) -> Dict[str, Any]:
        message = ""
        pid: Optional[int] = 0
        error = False
        using_existing = False

        if desired_gdbpid > 0:
            debug_session = self.debug_session_from_pid(desired_gdbpid)

            if debug_session:
                self.debug_session_to_client_ids[debug_session].append(client_id)
                message = (
                    f"gdbgui is using existing subprocess with pid {desired_gdbpid}"
                )
                using_existing = True
                pid = desired_gdbpid
            else:
                logger.error(f"could not find session with pid {desired_gdbpid}")
                message = f"Could not find a gdb subprocess with pid {desired_gdbpid}"
                error = True

        if self.debug_session_from_client_id(client_id) is None:
            logger.info("new sid", client_id)

            pty_for_user = Pty(cmd=gdb_command)
            pty_for_debugged_program = Pty()
            pty_machine_interface = Pty(echo=False)
            pty_for_user.write(f"new-ui {mi_version} {pty_machine_interface.name}\n")
            pty_for_user.write(f"set inferior-tty {pty_for_debugged_program.name}\n")

            pid = pty_for_user.pid
            debug_session = DebugSession(
                pygdbmi_controller=IoManager(
                    os.fdopen(pty_machine_interface.stdin, mode="wb", buffering=0),
                    os.fdopen(pty_machine_interface.stdout, mode="rb", buffering=0),
                    None,
                ),
                pty_machine_interface=pty_machine_interface,
                pty_for_user=pty_for_user,
                pty_for_debugged_program=pty_for_debugged_program,
                command=gdb_command,
                mi_version=mi_version,
                pid=pid,
            )
            self.debug_session_to_client_ids[debug_session] = [client_id]

        return {
            "pid": pid,
            "message": message,
            "error": error,
            "using_existing": using_existing,
        }

    def remove_debug_session_by_pid(self, gdbpid: int) -> List[str]:
        debug_session = self.debug_session_from_pid(gdbpid)
        if debug_session:
            orphaned_client_ids = self.remove_debug_session(debug_session)
        else:
            logger.info(f"could not find debug session with gdb pid {gdbpid}")
            orphaned_client_ids = []
        return orphaned_client_ids

    def remove_debug_session(self, debug_session: DebugSession) -> List[str]:
        try:
            debug_session.terminate()
        except Exception:
            logger.error(traceback.format_exc())
        orphaned_client_ids = self.debug_session_to_client_ids.pop(debug_session, [])
        return orphaned_client_ids

    def get_client_ids_from_gdb_pid(self, pid: int) -> List[str]:
        debug_session = self.debug_session_from_pid(pid)
        if debug_session:
            return self.debug_session_to_client_ids.get(debug_session, [])
        return []

    def get_pid_from_debug_session(self, debug_session: DebugSession) -> Optional[int]:
        if debug_session and debug_session.pid:
            return debug_session.pid
        return None

    def debug_session_from_pid(self, pid: int) -> Optional[DebugSession]:
        for debug_session in self.debug_session_to_client_ids:
            this_pid = self.get_pid_from_debug_session(debug_session)
            if this_pid == pid:
                return debug_session
        return None

    def debug_session_from_client_id(self, client_id: str) -> Optional[DebugSession]:
        for debug_session, client_ids in self.debug_session_to_client_ids.items():
            if client_id in client_ids:
                return debug_session
        return None

    def exit_all_gdb_processes(self):
        logger.info("exiting all subprocesses")
        for debug_session in self.debug_session_to_client_ids:
            # TODO kill gdb process and controller
            logger.info(f"Exiting debug session for pid {debug_session.pid}")
            debug_session.terminate()
            self.debug_session_to_client_ids.pop(debug_session)

    def get_dashboard_data(self) -> List[Any]:
        data = []
        for debug_session, client_ids in self.debug_session_to_client_ids.items():
            if debug_session.pid:
                pid = str(debug_session.pid)
            else:
                pid = "process no longer exists"
            data.append(
                {
                    "pid": pid,
                    "cmd": debug_session.command,
                    "number_of_connected_browser_tabs": len(client_ids),
                    "client_ids": client_ids,
                }
            )
        return data

    def disconnect_client(self, client_id: str):
        for _, client_ids in self.debug_session_to_client_ids.items():
            if client_id in client_ids:
                client_ids.remove(client_id)

    def _spawn_new_gdb_controller(self):
        pass

    def _connect_to_existing_gdb_controller(self):
        pass

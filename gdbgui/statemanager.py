import logging
import traceback
from collections import defaultdict
from typing import Any, Dict, List, Optional
import copy
from pygdbmi.gdbcontroller import GdbController

from .ptylib import Pty

logger = logging.getLogger(__name__)
GDB_MI_FLAG = ["--interpreter=mi2"]


class DebugSession:
    def __init__(
        self,
        controller: GdbController,
        pty_for_user: Pty,
        pty_for_debugged_program: Pty,
    ):
        self.controller = GdbController
        self.pty_for_user = pty_for_user
        self.pty_for_debugged_program = pty_for_debugged_program


class StateManager(object):
    def __init__(self, config: Dict[str, Any]):
        self.controller_to_client_ids: Dict[GdbController, List[str]] = defaultdict(
            list
        )  # key is controller, val is list of client ids

        self.pty_to_client_ids: Dict[Pty, List[str]] = defaultdict(
            list
        )  # key is controller, val is list of client ids
        self.gdb_reader_thread = None
        self.config = config
        self.clients: Dict[str, DebugSession] = {}

    def get_gdb_args(self):
        gdb_args = copy.copy(GDB_MI_FLAG)
        if self.config["gdb_args"]:
            gdb_args += self.config["gdb_args"]

        if self.config["initial_binary_and_args"]:
            gdb_args += ["--args"]
            gdb_args += self.config["initial_binary_and_args"]
        return gdb_args

    def connect_client(self, client_id: str, desired_gdbpid: int) -> Dict[str, Any]:
        message = ""
        pid: Optional[int] = 0
        error = False
        using_existing = False

        if desired_gdbpid > 0:
            controller = self.get_controller_from_pid(desired_gdbpid)

            if controller:
                self.controller_to_client_ids[controller].append(client_id)
                message = ("gdbgui is using existing subprocess with pid %s") % (
                    str(desired_gdbpid)
                )
                using_existing = True
                pid = desired_gdbpid
            else:
                print("error! could not find that pid")
                message = "Could not find a gdb subprocess with pid %s. " % str(
                    desired_gdbpid
                )
                error = True

        if self.get_controller_from_client_id(client_id) is None:
            logger.info("new sid", client_id)

            gdb_args = self.get_gdb_args()
            pty_for_user = Pty()
            pty_for_debugged_program = Pty()
            controller = GdbController(
                gdb_path=self.config["gdb_path"],
                gdb_args=gdb_args,
                # rr=self.config["rr"],
            )
            controller.write(f"new-ui console {pty_for_user.name}\n")
            controller.write(f"set inferior-tty {pty_for_debugged_program.name}\n")
            self.controller_to_client_ids[controller].append(client_id)
            self.pty_to_client_ids[pty_for_user].append(client_id)

            # self.sessions[DebugSession] = [client_id]
            self.clients[client_id] = DebugSession(
                controller=controller,
                pty_for_user=pty_for_user,
                pty_for_debugged_program=pty_for_debugged_program,
            )
            pid = controller.gdb_process.pid

        return {
            "pid": pid,
            "message": message,
            "error": error,
            "using_existing": using_existing,
        }

    def remove_gdb_controller_by_pid(self, gdbpid: int) -> List[str]:
        controller = self.get_controller_from_pid(gdbpid)
        if controller:
            orphaned_client_ids = self.remove_gdb_controller(controller)
        else:
            logger.info("could not find gdb controller with pid " + str(gdbpid))
            orphaned_client_ids = []
        return orphaned_client_ids

    def remove_gdb_controller(self, controller: GdbController) -> List[str]:
        try:
            controller.terminate()
        except Exception:
            logger.error(traceback.format_exc())
        orphaned_client_ids = self.controller_to_client_ids.pop(controller, [])
        return orphaned_client_ids

    def get_client_ids_from_gdb_pid(self, pid: int) -> List[str]:
        controller = self.get_controller_from_pid(pid)
        if controller:
            return self.controller_to_client_ids.get(controller, [])
        return []

    def get_client_ids_from_controller(self, controller: GdbController):
        return self.controller_to_client_ids.get(controller, [])

    # def get_pid_from_controller(
    #     self, controller: GdbController
    # ) -> Optional[int]:
    #     if controller and controller.pid:
    #         return controller.pid

    #     return None

    # def get_controller_from_pid(
    #     self, pid: int
    # ) -> Optional[GdbController]:
    #     for controller in self.controller_to_client_ids:
    #         this_pid = self.get_pid_from_controller(controller)
    #         if this_pid == pid:
    #             return controller

    #     return None

    def get_controller_from_client_id(self, client_id: str) -> Optional[GdbController]:
        for controller, client_ids in self.controller_to_client_ids.items():
            if client_id in client_ids:
                return controller

        return None

    def get_user_pty_from_client_id(self, client_id: str) -> Optional[Pty]:
        for pty, client_ids in self.pty_to_client_ids.items():
            if client_id in client_ids:
                return pty

        return None

    def exit_all_gdb_processes(self):
        logger.info("exiting all subprocesses")
        for controller in self.controller_to_client_ids:
            controller.terminate()
            self.controller_to_client_ids.pop(controller)

    def get_dashboard_data(self):
        data = {}
        for controller, client_ids in self.controller_to_client_ids.items():
            if controller.gdb_process:
                pid = str(controller.gdb_process.pid)
            else:
                pid = "process no longer exists"
            data[controller] = {
                "pid": pid,
                "cmd": " ".join(controller.cmd),
                "abs_gdb_path": controller.abs_gdb_path,
                "number_of_connected_browser_tabs": len(client_ids),
                "client_ids": client_ids,
            }
        return data

    def disconnect_client(self, client_id: str):
        for _, client_ids in self.controller_to_client_ids.items():
            if client_id in client_ids:
                client_ids.remove(client_id)

    def _spawn_new_gdb_controller(self):
        pass

    def _connect_to_existing_gdb_controller(self):
        pass

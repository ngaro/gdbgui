import React from "react";
import GdbApi from "./GdbApi.jsx";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { store } from "statorgfc";
import "xterm/css/xterm.css";
import GdbGuiTerminal from "./GdbGuiTerminal";
import constants from "./constants";
import Actions from "./Actions";
import Pty from "./Pty.jsx";

function customKeyEventHandler(config: {
  pty_name: string;
  pty: Terminal;
  canPaste: boolean;
  pidStoreKey: string;
}) {
  return async (e: KeyboardEvent): Promise<boolean> => {
    if (!(e.type === "keydown")) {
      return true;
    }
    // if (!e.shiftKey && e.ctrlKey && e.key === "c") {
    // console.log("todo interrupt pid ", store.get(config.pidStoreKey));
    // Actions.send_signal("SIGINT", store.get(config.pidStoreKey));
    // }
    if (e.shiftKey && e.ctrlKey) {
      const key = e.key.toLowerCase();
      if (key === "c") {
        const toCopy = await config.pty.getSelection();
        navigator.clipboard.writeText(toCopy);
        config.pty.focus();
        return false;
      } else if (key === "v") {
        if (!config.canPaste) {
          return false;
        }
        const toPaste = await navigator.clipboard.readText();

        GdbApi.socket.emit("pty_interaction", {
          data: { pty_name: config.pty_name, key: toPaste, action: "write" }
        });
        return false;
      }
    }
    return true;
  };
}
class GdbConsoleContainer extends React.Component {
  constructor(props) {
    super(props);
    this.userPtyRef = React.createRef();
    this.programPtyRef = React.createRef();
    this.gdbguiPtyRef = React.createRef();
    this.terminal = this.terminal.bind(this);
  }

  terminal(ref) {
    let className = " bg-black p-0 m-0 h-full align-baseline ";
    return (
      <div className={className}>
        <div className="absolute h-full w-1/3 align-baseline  " ref={ref}></div>
      </div>
    );
  }
  render() {
    let terminalsClass = "w-full h-full relative grid grid-cols-3 ";
    return (
      <div name="terminals" className={terminalsClass}>
        {this.terminal(this.userPtyRef)}
        {/* <GdbGuiTerminal /> */}
        {this.terminal(this.gdbguiPtyRef)}
        {this.terminal(this.programPtyRef)}
      </div>
    );
  }

  componentDidMount() {
    const fitAddon = new FitAddon();
    const programFitAddon = new FitAddon();
    const gdbguiFitAddon = new FitAddon();

    const userPty = new Terminal({
      cursorBlink: true,
      macOptionIsMeta: true,
      scrollback: 9999
    });
    userPty.loadAddon(fitAddon);
    userPty.open(this.userPtyRef.current);
    userPty.attachCustomKeyEventHandler(
      customKeyEventHandler({
        pty_name: "user_pty",
        pty: userPty,
        canPaste: true,
        pidStoreKey: "gdb_pid"
      })
    );
    GdbApi.socket.on("user_pty_response", function(data) {
      userPty.write(data);
    });
    userPty.onKey((data, ev) => {
      GdbApi.socket.emit("pty_interaction", {
        data: { pty_name: "user_pty", key: data.key, action: "write" }
      });
      if (data.domEvent.code === "Enter") {
        Actions.onConsoleCommandRun();
      }
    });

    const programPty = new Terminal({
      cursorBlink: true,
      macOptionIsMeta: true,
      scrollback: 9999
    });
    programPty.loadAddon(programFitAddon);
    programPty.open(this.programPtyRef.current);
    programPty.attachCustomKeyEventHandler(
      customKeyEventHandler({
        pty_name: "program_pty",
        pty: programPty,
        canPaste: true,
        pidStoreKey: "inferior_pid"
      })
    );
    programPty.write(constants.xtermColors.grey);
    programPty.write(
      "Program output -- Programs being debugged are connected to this terminal. " +
        "You can read output and send input to the program from here."
    );
    programPty.writeln(constants.xtermColors.reset);
    GdbApi.socket.on("program_pty_response", function(pty_response) {
      programPty.write(pty_response);
    });
    programPty.onKey((data, ev) => {
      GdbApi.socket.emit("pty_interaction", {
        data: { pty_name: "program_pty", key: data.key, action: "write" }
      });
    });

    const gdbguiPty = new Terminal({
      cursorBlink: false,
      macOptionIsMeta: true,
      scrollback: 9999,
      disableStdin: true,
      disableCursor: true
      // theme: { background: "#888" }
    });
    gdbguiPty.write(constants.xtermColors.grey);
    gdbguiPty.writeln("gdbgui output (read-only)");
    gdbguiPty.writeln(
      "Copy/Paste available in all terminals with ctrl+shift+c, ctrl+shift+v"
    );
    gdbguiPty.write(constants.xtermColors.reset);

    gdbguiPty.attachCustomKeyEventHandler(
      customKeyEventHandler({ pty_name: "unused", pty: gdbguiPty, canPaste: false })
    );

    gdbguiPty.loadAddon(gdbguiFitAddon);
    gdbguiPty.open(this.gdbguiPtyRef.current);
    // gdbguiPty is written to elsewhere
    store.set("gdbguiPty", gdbguiPty);

    setInterval(() => {
      console.log("fitting...");
      fitAddon.fit();
      programFitAddon.fit();
      gdbguiFitAddon.fit();

      GdbApi.socket.emit("pty_interaction", {
        data: {
          pty_name: "user_pty",
          rows: userPty.rows,
          cols: userPty.cols,
          action: "set_winsize"
        }
      });

      GdbApi.socket.emit("pty_interaction", {
        data: {
          pty_name: "program_pty",
          rows: programPty.rows,
          cols: programPty.cols,
          action: "set_winsize"
        }
      });
    }, 2000);

    setTimeout(() => {
      fitAddon.fit();
      programFitAddon.fit();
      gdbguiFitAddon.fit();
    }, 0);
  }
}

export default GdbConsoleContainer;

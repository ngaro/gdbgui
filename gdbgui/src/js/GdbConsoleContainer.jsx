import React from "react";
import GdbApi from "./GdbApi.jsx";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { store } from "statorgfc";
import "xterm/css/xterm.css";

class GdbConsoleContainer extends React.Component {
  constructor(props) {
    super(props);
    this.userPtyRef = React.createRef();
    this.programPtyRef = React.createRef();
    this.gdbguiPtyRef = React.createRef();
    this.terminal = this.terminal.bind(this);
  }

  terminal(color, ref) {
    let className = " bg-black p-0 m-0 h-full align-baseline ";
    return (
      <div className={className}>
        <div className="absolute h-full w-1/3 align-baseline  " ref={ref}></div>
      </div>
    );
  }
  render() {
    let terminalsClass = "w-full h-full relative text-center grid grid-cols-3 ";
    return (
      <div name="terminals" className={terminalsClass}>
        {this.terminal("bg-yellow-400", this.userPtyRef, "userPty")}
        {this.terminal("bg-red-700", this.gdbguiPtyRef, "gdbguiPty")}
        {this.terminal("bg-blue-700", this.programPtyRef, "programPty")}
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
    GdbApi.socket.on("user_pty_response", function(pty_response) {
      userPty.write(pty_response);
    });
    userPty.onKey((data, ev) => {
      GdbApi.socket.emit("write_to_user_pty", { data: data.key });
    });

    const programPty = new Terminal({
      cursorBlink: true,
      macOptionIsMeta: true,
      scrollback: 9999
    });
    programPty.loadAddon(programFitAddon);
    programPty.open(this.programPtyRef.current);
    programPty.writeln(
      "Program output. Programs being debugged are connected to this terminal. You can read output and send input from here."
    );
    GdbApi.socket.on("program_pty_response", function(pty_response) {
      programPty.write(pty_response);
    });
    programPty.onKey((data, ev) => {
      GdbApi.socket.emit("write_to_program_pty", { data: data.key });
    });

    const gdbguiPty = new Terminal({
      cursorBlink: false,
      macOptionIsMeta: true,
      scrollback: 9999,
      disableStdin: true,
      disableCursor: true
      // theme: { background: "#888" }
    });
    gdbguiPty.writeln("gdbgui output (read-only)");
    gdbguiPty.loadAddon(gdbguiFitAddon);
    gdbguiPty.open(this.gdbguiPtyRef.current);
    // gdbguiPty is written to elsewhere
    store.set("gdbguiPty", gdbguiPty);

    setInterval(() => {
      console.log("fitting...");
      fitAddon.fit();
      programFitAddon.fit();
      gdbguiFitAddon.fit();
    }, 2000);
    setTimeout(() => {
      fitAddon.fit();
      programFitAddon.fit();
      gdbguiFitAddon.fit();
    }, 0);
  }
}

export default GdbConsoleContainer;

import React from "react";
import GdbApi from "./GdbApi.jsx";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { store } from "statorgfc";
// import Pty from "./Pty.jsx";
import "xterm/css/xterm.css";

class GdbConsoleContainer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedOutput: "userPty"
    };

    this.userPtyRef = React.createRef();
    this.programPtyRef = React.createRef();
    this.gdbguiPtyRef = React.createRef();
  }
  componentDidMount() {
    const fitAddon = new FitAddon();
    const programFitAddon = new FitAddon();
    const gdbguiFitAddon = new FitAddon();

    const userPty = new Terminal({
      cursorBlink: true,
      macOptionIsMeta: true,
      scrollback: 1000
    });
    userPty.loadAddon(fitAddon);
    userPty.open(this.userPtyRef.current);
    userPty.writeln(
      "This terminal is connected to gdb. You can run any gdb command from here."
    );
    GdbApi.socket.on("user_pty_response", function(pty_response) {
      userPty.write(pty_response);
    });
    userPty.onKey((data, ev) => {
      GdbApi.socket.emit("write_to_user_pty", { data: data.key });
    });

    const programPty = new Terminal({
      cursorBlink: true,
      macOptionIsMeta: true,
      scrollback: 1000
    });
    programPty.loadAddon(programFitAddon);
    programPty.open(this.programPtyRef.current);
    programPty.writeln(
      "Program output. Programs being debugged are connected to this terminal. You can read output and send intput from here."
    );
    GdbApi.socket.on("program_pty_response", function(pty_response) {
      programPty.write(pty_response);
    });
    programPty.onKey((data, ev) => {
      GdbApi.socket.emit("write_to_program_pty", { data: data.key });
    });

    const gdbguiPty = new Terminal({
      cursorBlink: true,
      macOptionIsMeta: true,
      scrollback: 1000,
      disableStdin: true
    });
    gdbguiPty.writeln("gdbgui output. This terminal is read-only.");
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
    // setTimeout(fitAddon.fit, 0);
  }
  render() {
    console.log(this.state);
    return (
      <div className="w-full h-full bg-orange-800 flex flex-col">
        <div className="w-full flex-grow-0 bg-blue-200 text-black text-center">
          <ul className="list-none flex w-full justify-around">
            <li
              className="pointer chad hover:bg-blue-900"
              onClick={() => {
                this.setState({ selectedOutput: "userPty" });
              }}
            >
              User terminal
            </li>
            <li
              className="pointer chad hover:bg-blue-900"
              onClick={() => {
                this.setState({ selectedOutput: "gdbguiPty" });
              }}
            >
              gdbgui
            </li>
            <li
              className="pointer chad hover:bg-blue-900"
              onClick={() => {
                this.setState({ selectedOutput: "programPty" });
              }}
            >
              Debugged program
            </li>
          </ul>
        </div>
        <div className="flex-grow w-full max-h-full relative text-center">
          <div
            ref={this.userPtyRef}
            className={
              (this.state.selectedOutput === "userPty" ? "visible" : "invisible ") +
              " bg-yellow-400 p-0 m-0 h-full w-full absolute"
            }
            ref={this.userPtyRef}
          ></div>

          <div
            className={
              (this.state.selectedOutput === "gdbguiPty" ? "visible" : "invisible ") +
              " bg-red-400 p-0 m-0 h-full w-full absolute"
            }
            ref={this.gdbguiPtyRef}
          ></div>

          <div
            className={
              (this.state.selectedOutput === "programPty" ? "visible" : "invisible ") +
              " bg-blue-400 p-0 m-0 h-full w-full absolute"
            }
            ref={this.programPtyRef}
          ></div>
        </div>
      </div>
    );
  }
}

export default GdbConsoleContainer;

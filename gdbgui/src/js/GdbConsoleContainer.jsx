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
      selectedOutput: "multiPty"
    };

    this.userPtyRef = React.createRef();
    this.programPtyRef = React.createRef();
    this.gdbguiPtyRef = React.createRef();
    this.terminal = this.terminal.bind(this);
    this.tabs = this.tabs.bind(this);
  }

  terminal(color, ref, ptyName) {
    const multi = this.state.selectedOutput === "multiPty";
    const selected = this.state.selectedOutput === ptyName;
    const visible = multi || selected;
    let className = color + " p-0 m-0 h-full  ";
    if (visible) {
      className += " visible ";
    } else {
      className += " invisible ";
    }
    // if (multi) {
    let widthClass = "";
    if (multi) {
      widthClass = "absolute h-full w-1/3";
    } else {
      widthClass = "absolute h-full w-full";
    }
    return (
      <div className={className}>
        <div className={widthClass}>
          <div name={ptyName} className={className} ref={ref}></div>
        </div>
      </div>
    );
    // } else {
    // className += " absolute w-full ";
    // return (
    //   <div className={className}>
    //     <div name={ptyName} className={className} ref={ref}></div>
    //   </div>
    // );
    // }
    console.log(className);
  }
  render() {
    console.log(this.state);
    const multi = this.state.selectedOutput === "multiPty";
    let terminalsClass = "flex-grow w-full h-full relative text-center ";
    if (multi) {
      terminalsClass += " grid grid-cols-3 gap-0 ";
    }
    return (
      <div className="w-full h-full bg-orange-800 flex flex-col">
        {this.tabs()}

        <div name="terminals" className={terminalsClass}>
          {this.terminal("bg-yellow-400", this.userPtyRef, "userPty")}
          {this.terminal("bg-red-400", this.gdbguiPtyRef, "gdbguiPty")}
          {this.terminal("bg-pink-400", this.programPtyRef, "programPty")}
        </div>
      </div>
    );
  }
  tab(name, title) {
    const output = this.state.selectedOutput;
    const selected = name === output;
    let className = "pointer flex-1 text-white font-bold hover:bg-purple-900 py-2  ";
    if (selected) {
      className += " bg-purple-900";
    }
    //  + output ===
    // "multiPty"
    //   ? "bg-blue-300"
    //   : "bg-black ";
    return (
      <div
        className={className}
        onClick={() => {
          this.setState({ selectedOutput: name });
        }}
      >
        {title}
      </div>
    );
  }
  tabs() {
    const output = this.state.selectedOutput;
    return (
      <div className="w-full flex-grow-0 bg-blue-200 text-black text-center justify-around  m-0">
        <div className="flex justify-around items-stretch bg-black">
          {this.tab("multiPty", "All Terminals")}
          {this.tab("userPty", "gdb")}
          {this.tab("programPty", "Program input/output")}
          {this.tab("gdbguiPty", "gdbgui")}
        </div>
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
      scrollback: 1000,
      theme: { background: "purple" }
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
      cursorBlink: false,
      macOptionIsMeta: true,
      scrollback: 1000,
      disableStdin: true,
      disableCursor: true,
      theme: { background: "#888" }
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

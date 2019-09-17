// component to display output from gdb, as well as gdbgui diagnostic messages
//
import React from "react";

import GdbApi from "./GdbApi.jsx";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "../../../node_modules/xterm/css/xterm.css"

export default class GdbConsole extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      rows: 10,
      cols: 20
    };
    this.term = new Terminal({
      cursorBlink: true,
      macOptionIsMeta: true,
      scrollback: 1000
    });

    this.terminalEl = React.createRef();
    this.term.resize(this.state.cols, this.state.rows);
  }
  render() {
    return <div id="xtermconsole" ref={this.terminalEl} />;
  }
  componentDidMount() {
    const term = this.term;

    term.open(document.getElementById("xtermconsole"));

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    fitAddon.fit();

    term.writeln(`Welcome to gdbgui!`);
    term.writeln("https://github.com/cs01/gdbgui");
    term.writeln("Connecting to gdb...");

    GdbApi.socket.on("pty_response", function(pty_response) {
      console.log(pty_response);
      console.log(term);
      // term.write(pty_response);
    });

    term.onKey((key, ev) => {
      console.log(key);
      term.write(key)
      // socket.send(key);
    });
    // socket.addEventListener("open", event => {
    //   this.setState({ status: "connected" });
    //   term.writeln("Connection established");
    // });

    // socket.addEventListener("close", event => {
    //   this.setState({ status: "disconnected" });
    //   term.writeln("Connection ended");
    //   this.setState({ num_clients: 0 });
    // });

    // socket.addEventListener("message", event => {
    //   const data = JSON.parse(event.data);
    //   if (data.event === "new_output") {
    //     term.write(atob(data.payload));
    //   } else if (data.event === "resize") {
    //     clearTimeout(this.resizeTimeout);
    //     this.resizeTimeout = setTimeout(() => {
    //       this.term.resize(data.payload.cols, data.payload.rows);
    //       this.setState({ rows: data.payload.rows, cols: data.payload.cols });
    //     }, 500);
    //   } else if (data.event === "num_clients") {
    //     this.setState({ num_clients: data.payload });
    //   } else {
    //     console.error("unknown event type", data);
    //   }
    // });
  }
}

// component to display output from gdb, as well as gdbgui diagnostic messages
//
import React from "react";

import GdbApi from "./GdbApi.jsx";
// import { Terminal } from "xterm";
// import { FitAddon } from "xterm-addon-fit";
// import { WebglAddon } from "xterm-addon-webgl";
// import { WebLinksAddon } from "xterm-addon-web-links";
// import "../../../node_modules/xterm/css/xterm.css";

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
      scrollback: 10
    });

    this.ref = React.createRef();
    // this.term.resize(this.state.cols, this.state.rows);
  }
  render() {
    return <div id="xtermconsole" ref={this.ref} />;
  }
  componentDidMount() {
    const term = this.term;
    Terminal.applyAddon(fit);
    Terminal.applyAddon(fullscreen);
    const term = new Terminal({
      cursorBlink: true,
      macOptionIsMeta: true,
      scrollback: true
    });

    term.open(this.ref.current);
    term.fit();
    term.writeln("Welcome to gdbgui — https://github.com/cs01/gdbgui");
    term.writeln("Type 'shell' to enter your shell.");
    term.writeln("Entering gdb");
    term.writeln("");

    GdbApi.socket.on("pty_response", function(pty_response) {
      term.write(pty_response);
    });

    term.on("key", (key, ev) => {
      GdbApi.socket.emit("write_to_pty", { data: key });
    });

    function fitToscreen() {
      term.fit();
      GdbApi.socket.emit("resize", { cols: term.cols, rows: term.rows });
    }

    function debounce(func, wait_ms) {
      let timeout;
      return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait_ms);
      };
    }

    const wait_ms = 50;
    window.onresize = debounce(fitToscreen, wait_ms);

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

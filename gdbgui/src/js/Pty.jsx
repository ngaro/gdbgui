// component to display output from gdb, as well as gdbgui diagnostic messages
//
import React from "react";

import GdbApi from "./GdbApi.jsx";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebglAddon } from "xterm-addon-webgl";
import { WebLinksAddon } from "xterm-addon-web-links";
import "xterm/css/xterm.css";

export default class Pty extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      rows: 10,
      cols: 20
    };

    this.ref = React.createRef();
  }
  render() {
    return <div className="w-full h-full" ref={this.ref} />;
  }
  componentDidMount() {
    const term = new Terminal({
      cursorBlink: true,
      macOptionIsMeta: true,
      scrollback: 1000,
      ...this.props.terminalOptions
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(this.ref.current);

    term.writeln(this.props.startupText);

    const { websocketUrlOnKey, websocketUrlOnResize, socketResponseName } = this.props;
    GdbApi.socket.on(socketResponseName, function(pty_response) {
      term.write(pty_response);
    });

    term.onKey((data, ev) => {
      GdbApi.socket.emit(websocketUrlOnKey, { data: data.key });
    });

    function fitToscreen() {
      fitAddon.fit();
      GdbApi.socket.emit(websocketUrlOnResize, {
        cols: term.cols,
        rows: term.rows
      });
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

    setInterval(() => {
      fitAddon.fit();
    }, 2000);
    setTimeout(fitToscreen, 0);
  }
}

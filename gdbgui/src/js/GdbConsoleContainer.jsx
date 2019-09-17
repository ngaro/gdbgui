import React from "react";

import GdbConsole from "./GdbConsole.jsx";

class GdbConsoleContainer extends React.Component {
  render() {
    return (
      <div id="console_container">
        <GdbConsole />
      </div>
    );
  }
}

export default GdbConsoleContainer;

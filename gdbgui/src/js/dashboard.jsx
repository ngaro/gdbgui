import ReactDOM from "react-dom";
import React from "react";
import "../../static/css/tailwind.css";

const data = window.data;

function GdbguiSession(props) {
  const session = props.session;
  return <div>{session.pid}</div>;
}

class StartCommand extends React.Component {
  constructor(props) {
    super(props);
    this.state = { value: "gdb" };

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleChange(event) {
    this.setState({ value: event.target.value });
  }

  handleSubmit(event) {
    const params = new URLSearchParams({ gdb_command: this.state.value }).toString();
    window.location.replace(`/?${params}`);
  }

  render() {
    return (
      <>
        <div>Enter the gdb command to run in the session.</div>
        <div className="flex w-full mx-auto items-center container">
          <input
            type="text"
            className="flex-grow leading-9 bg-white focus:outline-none focus:shadow-outline border border-gray-300 py-2 px-2 block appearance-none rounded-l-lg"
            value={this.state.value}
            onChange={this.handleChange}
            placeholder="gdb --flag args"
          />
          <button
            className="flex-grow-0 leading-7 bg-blue-500 hover:bg-blue-700 border-blue-500 hover:border-blue-700 border-4 text-white py-2 px-2 rounded-r-lg"
            type="button"
            onClick={this.handleSubmit}
          >
            Start New Session
          </button>
        </div>
      </>
    );
  }
}

class Dashboard extends React.PureComponent {
  render() {
    console.log(window.data);
    const sessions = data.map(d => <GdbguiSession key={d.pid} session={d} />);
    return (
      <div className="w-full h-full bg-gray-300 text-center p-5">
        <div className="text-3xl font-semibold">Start new session</div>
        <StartCommand />
        <div className="mt-5 text-3xl font-semibold">
          There are {data.length} gdbgui debug session(s) already running
        </div>
        <div className="w-full h-full">{sessions}</div>
      </div>
    );
  }
}

ReactDOM.render(<Dashboard />, document.getElementById("dashboard"));

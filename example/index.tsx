import { Component, h, render } from "preact";

import termFont from "../assets/term_font.png";
import { ComputerActionable, KeyCode, LuaValue, Semaphore, Terminal, TerminalData, lwjgl2Code } from "../dist/index";
// Typically would import from "cc-web-term" instead.

type TerminalState = {
  on: boolean,
};

class TerminalDemo extends Component<{}, TerminalState> implements ComputerActionable {
  private readonly semaphore = new Semaphore();
  private readonly term = new TerminalData();

  public constructor() {
    super();

    this.setState({ on: true });
    this.term.resize(51, 19);
  }

  public render(_: {}, { on }: TerminalState) {
    return <Terminal
      id={123} label={"My computer"} on={on}
      changed={this.semaphore} computer={this} focused={true} terminal={this.term}
      font={termFont} />;
  }

  private write(text: string) {
    this.term.text[0] = text + " ".repeat(51 - text.length);
    this.semaphore.signal();
  }

  public queueEvent(event: string, args: LuaValue[]) {
    this.write(`Got ${event} ${JSON.stringify(args)}`);
  }

  public keyDown(key: KeyCode, repeat: boolean): void {
    const code = lwjgl2Code(key);
    if (code !== undefined) this.queueEvent("key", [code, repeat]);
  }

  public keyUp(key: KeyCode): void {
    const code = lwjgl2Code(key);
    if (code !== undefined) this.queueEvent("key_up", [code]);
  }

  public turnOn() {
    this.write("On");
    this.setState({ on: true });
  }

  public shutdown() {
    this.write("Shutdown");
    this.setState({ on: false });
  }

  public reboot() {
    this.write("Reboot");
    this.setState({ on: true });
  }
}
const page = document.getElementById("page") as HTMLElement;
render(<TerminalDemo />, page, page.lastElementChild || undefined);

import { type FunctionalComponent, h, render } from "preact";
import { useMemo, useState } from "preact/hooks";

import termFont from "../assets/term_font.png";
import { type ComputerActionable, type KeyCode, type LuaValue, Semaphore, Terminal, TerminalData, lwjgl2Code } from "../dist/index";
// Typically would import from "cc-web-term" instead.


class BasicComputer implements ComputerActionable {
  public readonly semaphore = new Semaphore();
  public readonly term = new TerminalData();

  private readonly setOn: (on: boolean) => void;
  private y: number = 0;

  public constructor(setOn: (on: boolean) => void) {
    this.setOn = setOn;
    this.term.resize(51, 19);
  }

  private write(text: string): void {
    const width = this.term.sizeX;
    const height = this.term.sizeY;

    const line = text.length >= width ? text.substring(0, width) : text + " ".repeat(51 - text.length);
    if (this.y == height) {
      this.term.text.shift();
      this.term.text[height - 1] = line;
    } else {
      this.term.text[this.y++] = line;
    }
    this.semaphore.signal();
  }

  public queueEvent(event: string, args: Array<LuaValue>): void {
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

  public transferFiles(files: Array<{ name: string, contents: ArrayBuffer }>): void {
    this.write("Transfer " + files.map(x => x.name).join(", "));
  }

  public turnOn(): void {
    this.write("On");
    this.setOn(true);
  }

  public shutdown(): void {
    this.write("Shutdown");
    this.setOn(false);
  }

  public reboot(): void {
    this.write("Reboot");
    this.setOn(true);
  }
}

const TerminalDemo: FunctionalComponent<unknown> = () => {
  const [on, setOn] = useState(false);
  const computer = useMemo(() => new BasicComputer(setOn), [setOn]);
  return <Terminal
    id={123} label={"My computer"} on={on}
    changed={computer.semaphore} computer={computer} focused={true} terminal={computer.term}
    font={termFont} />;
};


render(<TerminalDemo />, document.getElementById("page")!);

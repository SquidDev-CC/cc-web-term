import { Component, JSX, h } from "preact";
import type { ComputerActionable, Semaphore } from "../computer";
import { GIF } from "../files/gif";
import saveBlob from "../files/save";
import { Camera, NoEntry, Off, On, Videocam, VideocamRecording, Fullscreen } from "../font";
import logger from "../log";
import {
  actionButton, terminalBar, terminalButton, terminalButtonsRight, terminalCanvas, terminalInfo,
  terminalInput, terminalProgress, terminalView, terminalWrapper,
} from "../styles.css";
import type { TerminalData } from "./data";
import { convertKey, convertMouseButton, convertMouseButtons } from "./input";
import * as render from "./render";

const enum RecordingState { None, Recording, Rendering }

const log = logger("Terminal");

/**
 * Properties for the current terminal
 */
export type TerminalProps = {
  // Computer Data
  id: number | null,    /** The computer's ID */
  label: string | null, /** The computer's label */
  on: boolean,          /** Whether the computer is on */
  computer: ComputerActionable, /** The computer to fire events back to */

  // Terminal data
  changed: Semaphore,     /** A semaphore which is signaled when the terminal changes */
  terminal: TerminalData, /** The terminal to draw. */

  // Internal behaviour
  focused: boolean,      /** Whether this component is considered focused. */
  font: string,          /** The font to draw the terminal with  */
};

type TerminalState = {
  recording: RecordingState,
  progress: number,
};

const clamp = (value: number, min: number, max: number) => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const labelElement = (id: number | null, label: string | null) => {
  if (id === null && label === null) return "Unlabeled computer";
  if (id === null) return `${label}`;
  if (label === null) return `Computer #${id}`;
  return `${label} (Computer #${id})`;
};

export class Terminal extends Component<TerminalProps, TerminalState> {
  private canvasElem?: HTMLCanvasElement;
  private canvasContext?: CanvasRenderingContext2D;
  private inputElem?: HTMLInputElement;
  private wrapperElem?: HTMLDivElement;

  private changed: boolean = false;
  private lastBlink: boolean = false;

  private mounted: boolean = false;
  private drawQueued: boolean = false;

  private readonly vdom: JSX.Element[];

  private lastX: number = -1;
  private lastY: number = -1;

  private gif: GIF | null = null;
  private lastGifFrame: number | null = null;

  public constructor(props: TerminalProps, context: unknown) {
    super(props, context);

    this.setState({
      recording: RecordingState.None,
      progress: 0,
    });

    this.vdom = [
      <canvas class={terminalCanvas}
        onMouseDown={this.onMouse} onMouseUp={this.onMouse} onMouseMove={this.onMouse}
        onWheel={this.onMouseWheel} onContextMenu={this.onEventDefault} />,
      <input type="text" class={terminalInput}
        onPaste={this.onPaste} onKeyDown={this.onKey} onKeyUp={this.onKey} onInput={this.onInput}></input>,
    ];
  }

  public componentDidMount() {
    // Fetch the "key" elements
    const base = this.base as Element;
    this.canvasElem = base.querySelector(`.${terminalCanvas}`) as HTMLCanvasElement;
    this.canvasContext = this.canvasElem.getContext("2d") as CanvasRenderingContext2D;
    this.inputElem = base.querySelector(`.${terminalInput}`) as HTMLInputElement;
    this.wrapperElem = base.querySelector(`.${terminalWrapper}`) as HTMLDivElement;

    // Subscribe to some events to allow us to shedule a redraw
    window.addEventListener("resize", this.onResized);
    this.props.changed.attach(this.onChanged);

    // Set some key properties
    this.changed = true;
    this.lastBlink = false;
    this.mounted = true;

    // Focus on the input element
    if (this.props.focused) this.inputElem.focus();

    // And let's draw!
    this.queueDraw();
  }

  public componentWillUnmount() {
    this.canvasElem = undefined;
    this.canvasContext = undefined;
    this.inputElem = undefined;

    this.props.changed.detach(this.onChanged);
    window.removeEventListener("resize", this.onResized);

    this.lastBlink = false;
    this.mounted = false;
    this.drawQueued = false;
  }

  public render({ id, label, on }: TerminalProps, { recording, progress }: TerminalState) {
    const recordingDisabled = recording === RecordingState.Rendering;
    return <div class={terminalView}>
      <div class={terminalWrapper}>
        {...this.vdom}
        <div class={terminalBar}>
          <button class={`${actionButton} ${terminalButton}`} type="button"
            title={on ? "Turn this computer off" : "Turn this computer on"}
            onClick={on ? this.onPowerOff : this.onPowerOn}>
            {on ? <On /> : <Off />}
          </button>
          <span class={terminalInfo}>{labelElement(id, label)}</span>

          <span class={terminalButtonsRight}>
            <button class={`${actionButton} ${terminalButton}`} type="button"
              title="Take a screenshot of the terminal." onClick={this.onScreenshot}>
              <Camera />
            </button>
            <button class={`${actionButton} ${terminalButton} ${recordingDisabled ? "disabled" : ""}`} type="button"
              title="Record the terminal to a GIF." onClick={this.onRecord}>
              {recording === RecordingState.Recording ? <VideocamRecording /> : <Videocam />}
            </button>
            <button class={`${actionButton} ${terminalButton}`} type="button"
            title="Make the terminal full-screen" onClick={this.makeFullscreen}
            >
              <Fullscreen />
            </button>
            <button class={`${actionButton} ${terminalButton}`} type="button"
              title="Send a `terminate' event to the computer." onClick={this.onTerminate}>
              <NoEntry />
            </button>
          </span>
        </div>
        <div class={terminalProgress} style={`width: ${recording === RecordingState.Rendering ? progress * 100 : 0}%`}>
        </div>
      </div>
    </div>;
  }

  public componentDidUpdate() {
    this.changed = true;
    this.queueDraw();
    if (this.props.focused && this.inputElem) this.inputElem.focus();
  }

  public queueDraw() {
    if (this.mounted && !this.drawQueued) {
      this.drawQueued = true;
      window.requestAnimationFrame(time => {
        this.drawQueued = false;
        if (!this.mounted) return;

        // We push the previous frame before drawing the next one.
        this.addGifFrame();

        this.draw(time);

        // Schedule another redraw to handle the cursor blink
        if (this.props.terminal.cursorBlink) this.queueDraw();
      });
    }
  }

  private draw(time: number) {
    if (!this.canvasElem || !this.canvasContext || !this.wrapperElem) return;

    const { terminal, font: fontPath } = this.props;
    const sizeX = terminal.sizeX || 51;
    const sizeY = terminal.sizeY || 19;

    const font = render.loadFont(fontPath);
    if (font.promise) {
      font.promise.then(() => this.queueDraw());
      return;
    }

    const blink = Math.floor(time / 400) % 2 === 0;
    const changed = this.changed;

    if (!changed && (
      !terminal.cursorBlink || this.lastBlink === blink ||
      terminal.cursorX < 0 || terminal.cursorX >= sizeX ||
      terminal.cursorY < 0 || terminal.cursorY >= sizeY
    )) {
      return;
    }

    this.lastBlink = blink;
    this.changed = false;

    // Calculate terminal scaling to fit the screen
    const actualWidth = this.wrapperElem.parentElement!.clientWidth - render.terminalMargin * 2;
    /* [Note 'Padding']: 70px = 30px top-padding + action-bar + arbitrary bottom-padding. See styles.css too. */
    const actualHeight = this.wrapperElem.parentElement!.clientHeight - render.terminalMargin * 2 - 70;
    const width = sizeX * render.cellWidth;
    const height = sizeY * render.cellHeight;

    // The scale has to be an integer (though converted within the renderer) to ensure pixels are integers.
    // Otherwise you get texture issues.
    const scale = Math.max(1, Math.min(Math.floor(actualHeight / height), Math.floor(actualWidth / width)));

    const ctx = this.canvasContext;

    // If we"re just redrawing the cursor. We"ve aborted earlier if the cursor is not visible/
    // out of range and hasn"t changed.
    if (!changed) {
      if (blink) {
        render.foreground(
          ctx, terminal.cursorX, terminal.cursorY, terminal.currentFore, "_", terminal.palette,
          scale, font,
        );
      } else {
        const x = terminal.cursorX;
        const y = terminal.cursorY;

        render.background(ctx, x, y, terminal.back[y].charAt(x), scale, sizeX, sizeY, terminal.palette);
        render.foreground(
          ctx, x, y, terminal.fore[y].charAt(x), terminal.text[y].charAt(x), terminal.palette,
          scale, font,
        );
      }

      return;
    }

    // Actually update the canvas dimensions.
    const canvasWidth = width * scale + render.terminalMargin * 2;
    const canvasHeight = height * scale + render.terminalMargin * 2;

    if (this.canvasElem.height !== canvasHeight || this.canvasElem.width !== canvasWidth) {
      this.canvasElem.height = canvasHeight;
      this.canvasElem.width = canvasWidth;

      this.canvasElem.style.height = `${canvasHeight}px`;
      this.wrapperElem.style.width = this.canvasElem.style.width = `${canvasWidth}px`;
    }

    // Prevent blur when up/down-scaling
    ctx.imageSmoothingEnabled = false;
    /* eslint-disable @typescript-eslint/no-explicit-any */
    (ctx as any).oImageSmoothingEnabled = false;
    (ctx as any).webkitImageSmoothingEnabled = false;
    (ctx as any).mozImageSmoothingEnabled = false;
    (ctx as any).msImageSmoothingEnabled = false;
    /* eslint-enable @typescript-eslint/no-explicit-any */

    // And render!
    if (terminal.sizeX === 0 && terminal.sizeY === 0) {
      render.bsod(ctx, sizeX, sizeY, "No terminal output", scale, font);
    } else {
      render.terminal(ctx, terminal, blink, scale, font);
    }
  }

  private onResized = () => {
    this.changed = true;
    this.queueDraw();
  }

  private paste(clipboard: DataTransfer | undefined) {
    if (!clipboard) return;
    let content = clipboard.getData("text");
    if (!content) return;

    // Limit to allowed characters (actually slightly more generous but
    // there you go).
    content = content.replace(/[^\x20-\xFF]/gi, "");
    // Strip to the first newline
    content = content.replace(/[\r\n].*/, "");
    // Limit to 512 characters
    content = content.substr(0, 512);

    // Abort if we"re empty
    if (!content) return;

    this.props.computer.queueEvent("paste", [content]);
  }

  private addGifFrame(force?: boolean) {
    if (!this.gif || !this.canvasContext) return;

    if (!this.lastGifFrame) {
      console.error("Pushing a frame, but no previous frame!!");
      return;
    }

    // We limit ourselves to 20fps, just so we're not producing an insane number
    // of frames.
    const now = Date.now();
    if (!force && now - this.lastGifFrame < 50) return;

    log(`Adding frame for ${now - this.lastGifFrame} seconds`);
    this.gif.addFrame(this.canvasContext, { delay: now - this.lastGifFrame });
    this.lastGifFrame = now;
  }

  private onPaste = (event: ClipboardEvent) => {
    this.onEventDefault(event);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.paste((event.clipboardData || (window as any).clipboardData));
  }

  private onMouse = (event: MouseEvent) => {
    this.onEventDefault(event);
    if (!this.canvasElem) return;

    // If we"re a mouse move and nobody is pressing anything, let"s
    // skip for now.
    if (event.type === "mousemove" && event.buttons === 0) return;

    const x = clamp(
      Math.floor((event.pageX - this.canvasElem.offsetLeft - render.terminalMargin)
        / (this.canvasElem.width - 2 * render.terminalMargin) * this.props.terminal.sizeX) + 1,
      1, this.props.terminal.sizeX);
    const y = clamp(
      Math.floor((event.pageY - this.canvasElem.offsetTop - render.terminalMargin)
        / (this.canvasElem.height - 2 * render.terminalMargin) * this.props.terminal.sizeY) + 1,
      1, this.props.terminal.sizeY);

    switch (event.type) {
      case "mousedown": {
        const button = convertMouseButton(event.button);
        if (button) {
          this.props.computer.queueEvent("mouse_click", [button, x, y]);
          this.lastX = x;
          this.lastY = y;
        }
        break;
      }

      case "mouseup": {
        const button = convertMouseButton(event.button);
        if (button) {
          this.props.computer.queueEvent("mouse_up", [button, x, y]);
          this.lastX = x;
          this.lastY = y;
        }
        break;
      }

      case "mousemove": {
        const button = convertMouseButtons(event.buttons);
        if (button && (x !== this.lastX || y !== this.lastY)) {
          this.props.computer.queueEvent("mouse_drag", [button, x, y]);
          this.lastX = x;
          this.lastY = y;
        }
      }
    }
  }

  private onMouseWheel = (event: WheelEvent) => {
    this.onEventDefault(event);
    if (!this.canvasElem) return;

    const x = clamp(
      Math.floor((event.pageX - this.canvasElem.offsetLeft - render.terminalMargin)
        / (this.canvasElem.width - 2 * render.terminalMargin) * this.props.terminal.sizeX) + 1,
      1, this.props.terminal.sizeX);
    const y = clamp(
      Math.floor((event.pageY - this.canvasElem.offsetTop - render.terminalMargin)
        / (this.canvasElem.height - 2 * render.terminalMargin) * this.props.terminal.sizeY) + 1,
      1, this.props.terminal.sizeY);

    if (event.deltaY !== 0) {
      this.props.computer.queueEvent("mouse_scroll", [Math.sign(event.deltaY), x, y]);
    }
  }

  private onEventDefault = (event: Event) => {
    event.preventDefault();
    if (this.inputElem) this.inputElem.focus();
  }

  private onKey = (event: KeyboardEvent) => {
    if (!this.canvasElem) return;

    // Handle pasting. Might be worth adding shift+insert support too.
    // Note this is needed as we block the main paste event.
    if (event.type === "keydown" && (event.ctrlKey && event.code === "KeyV")) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (window as any).clipboardData;
      if (data) {
        this.paste(data);
        this.onEventDefault(event);
      }
      return;
    }

    // Try to pull the key number from the event. We first try the key code
    // (ideal, as it's independent of layout), then the key itself, or the
    // uppercase key (tacky shortcut to handle 'a' and 'A').
    let code = convertKey(event.code);
    if (code === undefined) code = convertKey(event.key);
    if (code === undefined) code = convertKey(event.key.toUpperCase());

    if (code !== undefined || event.key.length === 1) this.onEventDefault(event);

    if (event.type === "keydown") {
      if (code !== undefined) this.props.computer.keyDown(code, event.repeat);
      if (!event.altKey && !event.ctrlKey && event.key.length === 1) {
        this.props.computer.queueEvent("char", [event.key]);
      }
    } else if (event.type === "keyup") {
      if (code !== undefined) this.props.computer.keyUp(code);
    }
  }

  private onInput = (event: Event) => {
    const target = event.target as HTMLInputElement;
    this.onEventDefault(event);

    // Some browsers (*cough* Chrome *cough*) don't provide
    // KeyboardEvent.{code, key} for printable characters. Let's scrape it from
    // the input instead.
    const value = target.value;
    if (!value) return;
    target.value = "";

    this.props.computer.queueEvent(value.length === 1 ? "char" : "paste", [value]);
  }

  private onTerminate = (event: Event) => {
    this.onEventDefault(event);
    this.props.computer.queueEvent("terminate", []);
  }

  private onChanged = () => {
    this.changed = true;
    this.queueDraw();
  }

  private onPowerOff = (event: Event) => {
    this.onEventDefault(event);
    this.props.computer.shutdown();
  }

  private onPowerOn = (event: Event) => {
    this.onEventDefault(event);
    this.props.computer.turnOn();
  }

  private onScreenshot = (event: Event) => {
    this.onEventDefault(event);
    if (!this.canvasElem) return;

    this.canvasElem.toBlob(blob => saveBlob("computer", "png", blob), "image/png", 1);
  }

  private onRecord = (event: Event) => {
    this.onEventDefault(event);

    if (!this.canvasElem) return;

    switch (this.state.recording) {
      // Skip the cases when we've got no data
      case RecordingState.Rendering:
        break;

      // If we're not recording, start recording.
      case RecordingState.None:
        this.gif = new GIF({
          width: this.canvasElem.width,
          height: this.canvasElem.height,
          quality: 10,
        });
        this.lastGifFrame = Date.now();
        this.setState({ recording: RecordingState.Recording });
        break;

      case RecordingState.Recording:
        if (!this.gif) {
          this.setState({ recording: RecordingState.None });
          return;
        }

        this.setState({ recording: RecordingState.Rendering });

        this.addGifFrame(true);

        this.gif.onFinished = blob => {
          this.setState({ recording: RecordingState.None });
          saveBlob("computer", "gif", blob);
        };
        this.gif.onProgress = progress => this.setState({ progress });
        this.gif.onAbort = () => {
          this.setState({ recording: RecordingState.None });
          console.error("Rendering GIF failed");
        };

        this.gif.render();

        this.gif = null;
        this.lastGifFrame = null;
    }
  }

  private makeFullscreen = (event : Event) => {
    this.onEventDefault(event);
    (this.base as Element|null)?.requestFullscreen().catch(e => {
      console.error("Cannot make full-screen", e);
    })
  }
}

import type { KeyCode } from "./terminal/input";

export class Semaphore {
  private readonly listeners = new Set<() => void>();

  public attach(listener: () => void): void {
    this.listeners.add(listener);
  }

  public detach(listener: () => void): void {
    this.listeners.delete(listener);
  }

  public signal(): void {
    for (const listener of this.listeners) listener();
  }
}

/**
 * Types admissable to the Lua side
 */
export type LuaValue = number | string | boolean;

/**
 * An object on which one can perform computer actions.
 */
export interface ComputerActionable {
  /**
   * Queue an event on the computer
   */
  queueEvent(event: string, args: Array<LuaValue>): void;

  /**
   * Fire a {@code key} event.
   *
   * @param key The key code. This can be translated to a suitable numeric value.
   * @param repeat Whether this is a repeated key.
   * @see #queueEvent
   */
  keyDown(key: KeyCode, repeat: boolean): void;

  /**
   * Fire a {@code key_up} event.
   *
   * @param key The key code. This can be translated to a suitable numeric value.
   * @see #queueEvent
   */
  keyUp(key: KeyCode): void;

  /**
   * Turn on the computer
   */
  turnOn(): void;

  /**
   * Shut down the computer
   */
  shutdown(): void;

  /**
   * Reboot the computer
   */
  reboot(): void;

  /**
   * Transfer some files to this computer.
   *
   * @param files A list of files and their contents.
   */
  transferFiles(files: Array<{ name: string, contents: ArrayBuffer }>): void;
}

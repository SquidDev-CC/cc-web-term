import type { KeyCode } from "./terminal/input";

export class Semaphore {
  private readonly listeners: Set<() => void> = new Set();

  public attach(listener: () => void) {
    this.listeners.add(listener);
  }

  public detach(listener: () => void) {
    this.listeners.delete(listener);
  }

  public signal() {
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
  queueEvent(event: string, args: LuaValue[]): void;

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
}

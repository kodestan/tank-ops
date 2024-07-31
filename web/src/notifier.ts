import { GameEvent } from "./game-event";

interface Receiver {
  update(event: GameEvent): void;
}
export class Notifier {
  receiver: Receiver;

  constructor(receiver: Receiver) {
    this.receiver = receiver;
  }

  notify(event: GameEvent) {
    this.receiver.update(event);
  }
}

import { GameEventType } from "./game-event.js";
import { Notifier } from "./notifier.js";

const AUDIO_PATH = "/assets/sounds.mp3";
const AudioCtx =
  window.AudioContext || ((window as any).webkitAudioContext as AudioContext);

type ContinualSoundType = "driving" | "turret-rotation";
type SoundEffectType = "tank-firing" | "explosion";

const CONFIG = {
  driving: { loopStart: 1, loopEnd: 15 },
  "turret-rotation": { loopStart: 19.5, loopEnd: 23 },
  "tank-firing": { start: 24.88, length: 1.1 },
  explosion: { start: 29, length: 4 },
};

type AudioNodes = {
  audioBuffer: AudioBuffer;
  gainGame: GainNode;
  gainGlobal: GainNode;
  ambient: AudioBufferSourceNode;

  driving: GainNode;
  "turret-rotation": GainNode;
  "tank-firing": AudioBufferSourceNode | null;
  explosion: AudioBufferSourceNode | null;
};

export class AudioDriver {
  notifier: Notifier;
  audioCtx: AudioContext = new AudioCtx();
  nodes: AudioNodes | null = null;

  cachedGainLevels = {
    global: 0,
    game: 0,
  };

  constructor(notifier: Notifier) {
    fetch(AUDIO_PATH)
      .then((r) => r.arrayBuffer())
      .then((b) => this.audioCtx.decodeAudioData(b))
      .then((a) => this.handleLoaded(a))
      .catch(this.handleFail);
    this.notifier = notifier;
  }

  private handleLoaded = (audio: AudioBuffer) => {
    this.nodes = this.getNodes(audio);
    this.notifier.notify({ type: GameEventType.AudioLoadSuccess });
  };

  private handleFail = () => {
    this.notifier.notify({ type: GameEventType.AudioLoadFail });
  };

  private getNodes(audioBuffer: AudioBuffer): AudioNodes {
    const masterSilencer = this.audioCtx.createGain();
    masterSilencer.gain.value = 0.4;
    const gainGlobal = this.audioCtx.createGain();
    gainGlobal.gain.value = this.cachedGainLevels.global;
    const gainGame = this.audioCtx.createGain();
    gainGame.gain.value = this.cachedGainLevels.game;
    const ambient = this.audioCtx.createBufferSource();
    ambient.buffer = audioBuffer;
    ambient.loopStart = 34.1;
    ambient.loopEnd = 37.2;
    ambient.loop = true;
    ambient.playbackRate.value = 0.85;
    ambient.start(0, 34.1);
    const silencerNode = this.audioCtx.createGain();
    silencerNode.gain.value = 0.2;

    // TODO clean this up

    const drivingGain = this.audioCtx.createGain();
    drivingGain.gain.value = 0;
    drivingGain.connect(gainGame);
    const drivingSourceNode = this.audioCtx.createBufferSource();
    drivingSourceNode.buffer = audioBuffer;
    drivingSourceNode.loopStart = CONFIG["driving"].loopStart;
    drivingSourceNode.loopEnd = CONFIG["driving"].loopEnd;
    drivingSourceNode.loop = true;
    drivingSourceNode.connect(drivingGain);
    drivingSourceNode.start(0, CONFIG["driving"].loopStart);

    const turretRotationGain = this.audioCtx.createGain();
    turretRotationGain.gain.value = 0;
    turretRotationGain.connect(gainGame);
    const turretRotationSourceNode = this.audioCtx.createBufferSource();
    turretRotationSourceNode.buffer = audioBuffer;
    turretRotationSourceNode.loopStart = CONFIG["turret-rotation"].loopStart;
    turretRotationSourceNode.loopEnd = CONFIG["turret-rotation"].loopEnd;
    turretRotationSourceNode.loop = true;
    turretRotationSourceNode.connect(turretRotationGain);
    turretRotationSourceNode.start(0, CONFIG["turret-rotation"].loopStart);

    masterSilencer.connect(this.audioCtx.destination);
    gainGlobal.connect(masterSilencer);
    gainGame.connect(gainGlobal);
    silencerNode.connect(gainGame);
    ambient.connect(silencerNode);

    return {
      audioBuffer: audioBuffer,
      gainGame: gainGame,
      gainGlobal: gainGlobal,
      ambient: ambient,

      driving: drivingGain,
      "turret-rotation": turretRotationGain,
      "tank-firing": null,
      explosion: null,
    };
  }

  public setSoundInGame(play: boolean) {
    if (this.nodes === null) {
      this.cachedGainLevels.game = play ? 1 : 0;
      return;
    }
    this.nodes.gainGame.gain.value = play ? 1 : 0;
    if (play && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
  }

  public setSoundGlobal(play: boolean) {
    if (this.nodes === null) {
      this.cachedGainLevels.global = play ? 1 : 0;
      return;
    }
    this.nodes.gainGlobal.gain.value = play ? 1 : 0;
    if (play && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
  }

  public startSound(sound: ContinualSoundType) {
    if (this.nodes === null) return;
    this.nodes[sound].gain.value = 1;
  }

  public endSound(sound: ContinualSoundType) {
    if (this.nodes === null) return;
    this.nodes[sound].gain.value = 0;
  }

  public playSoundEffect(sound: SoundEffectType) {
    if (this.nodes === null) {
      return;
    }
    if (this.nodes[sound] !== null) {
      this.nodes[sound].disconnect();
    }
    const node = this.audioCtx.createBufferSource();
    node.buffer = this.nodes.audioBuffer;
    node.connect(this.nodes.gainGame);
    node.start(0, CONFIG[sound].start, CONFIG[sound].length);
    this.nodes[sound] = node;
  }
}

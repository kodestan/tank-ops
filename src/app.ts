import { BASE_CONFIG, Game } from "./game.js";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

const config = BASE_CONFIG;
const game = new Game(ctx, config);
game.run();

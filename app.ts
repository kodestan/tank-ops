const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

class Game {
  ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    window.addEventListener("resize", () => {
      this.resize();
    });
    requestAnimationFrame(() => {
      this.draw();
    });
    this.resize();
  }

  draw() {
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.fillStyle = "white";
    this.ctx.fillRect(
      10,
      10,
      this.ctx.canvas.width - 20,
      this.ctx.canvas.height - 20,
    );
    requestAnimationFrame(() => {
      this.draw();
    });
  }

  resize() {
    const boundingBox = canvas.parentElement!.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio;

    this.ctx.canvas.width = boundingBox.width * pixelRatio;
    this.ctx.canvas.height = boundingBox.height * pixelRatio;
    this.ctx.canvas.style.width = `${boundingBox.width}px`;
    this.ctx.canvas.style.height = `${boundingBox.height}px`;
  }
}

const game = new Game(ctx);
game.draw();

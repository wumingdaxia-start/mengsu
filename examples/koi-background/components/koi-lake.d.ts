export function createKoiLake(canvas: HTMLCanvasElement, options?: {base?: string}): {
  resize(width: number, height: number): void;
  move(x: number, y: number): void;
  render(deltaSeconds: number, elapsedSeconds: number): void;
  setActive(active: boolean): void;
  leave(): void;
  destroy(): void;
};

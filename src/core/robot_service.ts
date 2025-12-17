import robot from "robotjs";
import clipboardy from "clipboardy";

export class RobotService {
  private static instance: RobotService;
  private lastMousePos: { x: number; y: number } | null = null;
  private readonly SAFETY_THRESHOLD = 50; // pixels

  private constructor() {
    // 设置鼠标延迟，避免操作过快被检测或反应不过来
    robot.setMouseDelay(10);
    robot.setKeyboardDelay(10);
  }

  public static getInstance(): RobotService {
    if (!RobotService.instance) {
      RobotService.instance = new RobotService();
    }
    return RobotService.instance;
  }

  /**
   * 检查鼠标是否被用户大幅移动（安全制动）
   * 如果上次记录的位置与当前位置距离超过阈值，则视为用户介入
   */
  private checkSafety() {
    if (this.lastMousePos) {
      const currentPos = robot.getMousePos();
      const dist = Math.sqrt(
        Math.pow(currentPos.x - this.lastMousePos.x, 2) +
          Math.pow(currentPos.y - this.lastMousePos.y, 2)
      );

      if (dist > this.SAFETY_THRESHOLD) {
        throw new Error(
          `Safety Brake Activated: Mouse moved by user (${Math.round(
            dist
          )}px). Stopping execution.`
        );
      }
    }
    // Update last known position to current, assuming we are now in control
    this.updateLastMousePos();
  }

  private updateLastMousePos() {
    this.lastMousePos = robot.getMousePos();
  }

  /**
   * 点击屏幕指定位置
   */
  public async tap(x: number, y: number) {
    this.checkSafety();

    // 移动鼠标
    robot.moveMouse(x, y);

    // 点击
    robot.mouseClick();
    this.updateLastMousePos(); // Update again after click
  }

  /**
   * 滚动屏幕
   * @param direction 'up' | 'down'
   * @param magnitude 滚动幅度
   */
  public async scroll(direction: "up" | "down", magnitude: number = 100) {
    this.checkSafety();

    // RobotJS scrollMouse(x, y)
    // x: horizontal, y: vertical.
    // down is negative? strict testing needed. Usually down is positive in scroll events but check OS.
    // In robotjs: "If magnitude is positive, scroll up. If magnitude is negative, scroll down." -> Wait, docs say: "scrollMouse(x, y)"
    // Let's assume common convention: positive y is up?
    // StackOverflow says: robot.scrollMouse(0, -10) scrolls down.

    // 为了平滑滚动，可以将 magnitude 分解
    robot.scrollMouse(0, direction === "up" ? magnitude / 10 : -magnitude / 10);
  }

  /**
   * 输入文字
   * 使用 剪贴板 + Ctrl/Cmd+V 的方式，支持中文
   */
  public async input(text: string) {
    this.checkSafety();

    // 1. 写入剪贴板
    await clipboardy.write(text);

    // 2. 模拟粘贴
    // Windows/Linux: Ctrl+V, Mac: Command+V
    const modifier = process.platform === "darwin" ? "command" : "control";
    robot.keyTap("v", [modifier]);

    // 等待粘贴完成
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  /**
   * 按下按键
   */
  public async pressKey(key: string, modifiers: string[] = []) {
    this.checkSafety();
    robot.keyTap(key, modifiers);
  }

  /**
   * 获取当前鼠标位置
   */
  public getMousePos() {
    return robot.getMousePos();
  }
}

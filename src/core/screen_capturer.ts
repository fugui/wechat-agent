import robot from "robotjs";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { windowManager } from "node-window-manager";

// Wechat window size constants
const WECHAT_WINDOW_WIDTH = 850;
const WECHAT_WINDOW_HEIGHT = 720;

/**
 * 屏幕捕获服务
 * 负责截取屏幕指定区域，主要用于获取微信窗口的图像状态
 */
export class ScreenCapturer {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(process.cwd(), "temp_screenshots");
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  public async adjustWindow() {
    // 获取所有窗口
    const windows = windowManager.getWindows();

    // 查找目标窗口（通过标题）
    const targetWindow = windows.find((win: any) =>
      win.getTitle().includes("微信")
    );

    if (targetWindow) {
      // 设置窗口位置和大小
      targetWindow.setBounds({
        x: 0, // 水平位置
        y: 0, // 垂直位置
        width: WECHAT_WINDOW_WIDTH, // 宽度
        height: WECHAT_WINDOW_HEIGHT, // 高度
      });
      targetWindow.bringToTop();
    }
  }

  /**
   * 截取屏幕左半部分 (默认微信窗口位置)
   * @returns Buffer 图片数据的 Buffer 对象 (PNG 格式)
   */
  public async captureLeftScreen(): Promise<Buffer> {
    const screenSize = robot.getScreenSize();
    // 默认截取左半边屏幕，因为根据规范微信需要置于左侧
    const width = WECHAT_WINDOW_WIDTH;
    const height = WECHAT_WINDOW_HEIGHT;

    // robotjs 返回的是 raw bitmap (BGRA)
    const img = robot.screen.capture(0, 0, width, height);

    // 将 BGRA 数据转换为 Sharp 可处理的 PNG Buffer
    // RobotJS 的 image.image 是一个 Buffer，包含原始像素数据
    // 格式通常是 BGRA，需要特别注意颜色通道

    // 创建一个新的 Buffer 来处理颜色通道交换 (BGRA -> RGBA) 如果需要，
    // 但 Sharp 也可以处理原始数据。为了通用性，我们先尝试直接处理。
    // 注意: robotjs 的 screen.capture 返回的对象包含 width, height, image (buffer)

    const rawBuffer = img.image;

    // 使用 Sharp 处理原始像素数据
    // RobotJS 除了 image 还有 stride 等信息，但在简单场景下 width * height * 4 即可
    const pngBuffer = await sharp(rawBuffer, {
      raw: {
        width: img.width,
        height: img.height,
        channels: 4, // RobotJS 通常是 4 通道
      },
    })
      // RobotJS 往往返回 BGRA，Sharp 默认当作 RGBA，可能会导致颜色反转 (红蓝互换)
      // 如果发现截图颜色不对，需要添加 .ensureAlpha() 或自行交换通道
      // 这里先不做复杂处理，待测试验证。如果颜色反转可以使用 .recomb() 或类似操作修复，
      // 或者简单地在后续 AI 分析中忽略色差（AI 对形状和文字更敏感）。
      // 更稳妥的方式可能是手动交换 B 和 R 通道，但会有性能损耗。
      // 许多 RobotJS + Sharp 的实践表明直接 pipe 是可行的，或者使用 jpeg 格式输出。
      .png({
        palette: true, // 使用调色板模式，显著减小体积
        colors: 64, // 限制颜色数量为 64 色，对于软件界面通常足够
        compressionLevel: 6,
      })
      .toBuffer();

    return pngBuffer;
  }

  /**
   * 保存截图到本地仅仅用于调试
   */
  public async saveDebugScreenshot(
    buffer: Buffer,
    filename: string = "debug.png"
  ): Promise<string> {
    const filePath = path.join(this.tempDir, filename);
    await sharp(buffer).toFile(filePath);
    return filePath;
  }
}

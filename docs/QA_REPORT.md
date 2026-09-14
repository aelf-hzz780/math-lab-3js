# FORMA 1.2 验收报告 / Validation Report

验收日期：2026-09-14。**18/18 实验离线运行，112/112 数学与状态测试通过。** 新增「虹彩异境」程序化悬浮地形。离线构建、18 张截图、下列三个浏览器验收报告使用相同 SHA-256。历史验收保留在 [1.1](QA_BASELINE_1.1.md) 和 [1.0](QA_BASELINE_1.0.md)。

Validated on 2026-09-14. **All 18 scenes run offline and all 112 math/state tests pass.** This version adds Iridescent Strata, a procedural floating landscape. The offline bundle, 18 screenshots and the three browser reports below share the same SHA-256. Historical 1.1 and 1.0 reports are preserved separately.

## 结果 / Results

| 验收 / Check | 结果 / Result | 记录 / Evidence |
| --- | --- | --- |
| 离线加载 / Offline loading | 18/18；零运行期 HTTP(S) 请求，零页面/着色器错误 / zero runtime requests or page/shader errors | [offline-report.json](qa/offline-report.json) |
| 预设 / Presets | 54 桌面 + 54 触控模拟，共 108 次 / 108 activations | [presentation-report.json](qa/presentation-report.json) |
| 虹彩地形 / Terrain | 3 预设、10 参数边界、动作、seed 与 reset PNG 哈希复现 / presets, bounds, actions and reproducible exports | [terrain-report.json](qa/terrain-report.json) |
| 流式生成 / Streaming | 72.3 m，常驻最多 15 块 / at most 15 resident chunks | [terrain-report.json](qa/terrain-report.json) |
| 切换与清理 / Switching and cleanup | 20 次目录切换、4 次加载中止；37 Worker 创建 = 37 终止 / 20 switches, 4 load aborts, all workers terminated | [terrain-report.json](qa/terrain-report.json) |
| 手机与恢复 / Mobile and recovery | 390×844 触控、横竖屏相机复位、无横向溢出、PNG、低动态与 Worker 回退 / touch, framing, PNG, reduced motion, worker fallback | [terrain-report.json](qa/terrain-report.json) |

预设参数均与声明匹配。删除或损坏 bundle 的模拟均显示 Trace ID 和恢复入口，不会永久显示加载提示。虚拟时钟检查确认暂停时间及相机稳定。返回原 seed 后、重置后，地形画布导出的 PNG 与原始 PNG 在同一浏览器会话逐字节一致；不同 GPU/浏览器不承诺像素一致。

Preset parameters match their declarations. Missing or malformed bundles display a Trace ID and recovery UI. Virtual-clock checks confirm pause and camera stability. Restoring the terrain seed and resetting reproduce identical canvas PNG bytes within the same browser session; cross-GPU/browser pixel identity is not promised.

## 数学与资源 / Mathematics and Resources

新增 23 个测试覆盖：三维密度的多层占据、孔洞比例、固定 seed、有限输入、外向非退化三角形、内部网格闭合与相邻块位置/法线一致；分块窗口边界、队列上限、真实 Worker 消息传输、降级、错误与取消；场景原子替换、长距离重置和过期任务失效。原有 89 个数学与状态测试仍通过。

The 23 new tests cover multivalued density, open-gap coverage, seed determinism, input bounds, nondegenerate outward triangles, interior closure, matching chunk boundaries/normals, bounded planning and queues, real worker transfer, fallback, cancellation, atomic scene replacement and long-distance reset. The preceding 89 tests remain green.

渲染只挂载 15 块；换结构参数时旧集合保持可见，后台替换集合完成后原子提交。生成较慢时穿行暂停以保持窗口完整。10 次返回地形后的已预热 GPU 计数固定为 23 geometries / 6 textures；穿行时计数可随裁剪和首次上传变化，但没有持续增长。共享 PMREM 临时资源属于 renderer 缓存，环境纹理与场景 Worker 随切换释放。

Only 15 chunks are mounted. Structural changes retain the visible set until a replacement commits atomically, with travel paused while generation catches up. Ten returns to terrain each recorded the same warmed GPU counts: 23 geometries and 6 textures. Travel counts can vary with culling and first upload but did not grow without bound. Shared PMREM scratch resources belong to the renderer cache; environment textures and scene workers are released on switching.

## 环境与性能 / Environment and Performance

Apple M3 Pro，macOS arm64，Node.js v26.5.0，Google Chrome 152.0.7977.83，headless。虹彩地形默认参数、1280×800、DPR 1、高画质，在独立真实时钟页面播放 5.348 秒，末尾短窗口采样为 **60 FPS**。此测量没有同时运行其他浏览器测试。触屏验收在同一台 Mac 模拟 390×844、DPR 2，应用低画质 DPR 上限 1。

Apple M3 Pro, macOS arm64, Node.js v26.5.0 and headless Google Chrome 152.0.7977.83. Default terrain at 1280×800, DPR 1 and high quality played for 5.348 seconds on a separate real-clock page, with a final short-window sample of **60 FPS**. No other browser suite ran during this measurement. Touch checks emulate 390×844 at DPR 2 on the same Mac; low-quality rendering is capped at DPR 1.

这不是 iOS/Android 真机或长期热稳定性测试，也不替代堆内存和驱动泄漏分析。完整细孔与岩片轮廓受采样分辨率影响；手动镜头可以离开可见窗口，系统没有碰撞避障。极长距离的材质噪声受浮点精度限制。参考视频的作者算法未经取得或核验，本实验不主张逐像素复现。

These are not physical iOS/Android or sustained thermal measurements, nor exhaustive heap/driver-leak tests. Grid resolution limits small holes and silhouettes. Manual views can leave the visible window; no collision avoidance is provided. Very long travel affects material-noise precision. The reference author's algorithm has not been obtained or verified, so this is not a pixel-exact reconstruction.

## 截图与复现 / Screenshots and Reproduction

18 张真实 JPEG，1280×800、质量 82，总计 1,911,777 bytes（1.82 MiB），低于 3 MiB 预算。新增地形图为 185,321 bytes。固定 seed 42、默认参数及镜头；虚拟时钟 FPS 不作为性能依据。参数、图像 SHA、来源与源码路径见 [截图索引](screenshots/manifest.json) 和 [图集](EXAMPLES.md)。

18 actual JPEG screenshots at 1280×800 and quality 82 total 1,911,777 bytes (1.82 MiB), within the 3 MiB budget. The terrain image is 185,321 bytes. Captures use seed 42, default parameters and fixed cameras; virtual-clock FPS is not performance evidence. The manifest records parameters, image hashes, sources and code paths.

```sh
npm test
npm run build
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/terrain-check.mjs
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/offline-check.mjs
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/presentation-check.mjs
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/capture-examples.mjs
```

Offline bundle: 908,289 bytes. SHA-256:

`a245862eb225b082fda822e8c70fcff5f2c8bbd8db21b64c475eb2ad7be9c151`

Worker: 3,808 bytes, embedded Blob IIFE; no runtime network dependency.

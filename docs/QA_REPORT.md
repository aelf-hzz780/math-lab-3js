# FORMA 1.3.0 验收报告 / Validation Report

验收日期：2026-09-16。**20/20 实验可离线运行，142/142 数学、状态与手势测试通过。** 本版新增流彩粒子画与液态玻璃，各含三个预设、指针交互和可复现模型。完整图集现有 20 张截图、60 个预设；此前的地形验收保留在 [1.2.1 基线](QA_BASELINE_1.2.1.md)，不作为本版重新测得的地形性能。

Validated on 2026-09-16. **All 20 scenes run offline and all 142 mathematics, state and gesture tests pass.** This release adds particle painting and liquid glass, each with three presets, pointer interaction and reproducible models. The catalog contains 20 captured scenes and 60 presets. Earlier terrain results are preserved in the [1.2.1 baseline](QA_BASELINE_1.2.1.md), rather than presented as new terrain performance measurements.

## 实现与回归 / Implementation and regressions

粒子画包含三种原创程序构图、闭环平滑变形、解析 curl 位移、沿流向排列的细纤维与真实画框纵深。默认桌面 24 万粒子，手机最多 12 万并放大笔触。测试验证 seed 前缀稳定、混合权重和闭环连续性、curl 数值散度、参数边界以及几何重建/释放。

Particle painting includes three original procedural compositions, smooth cyclic morphing, analytic curl displacement, aligned fine fibers and real frame depth. Defaults are 240,000 desktop particles and a 120,000 mobile cap with wider strokes. Tests cover stable seed prefixes, normalized continuous blend weights, numerical curl divergence, bounds, geometry replacement and disposal.

液态玻璃用相融环体与液滴形成连续曲面；程序化云层通过有限的入射/出射光线折射，临界阻尼弹簧驱动牵引与回弹。测试覆盖固定目标下的帧率一致性、回弹收敛、场连续性、Snell 定律/全反射、无效参数与资源释放。暂停后仍有形变时重新拖动或轻触，不再改变已渲染的 anchor；恢复播放后才推进。两个新材质也移除了反向 smoothstep 的未定义 GLSL 写法。

Liquid glass joins warped rings and droplets into a continuous surface, refracts procedural clouds through finite entry/exit rays, and uses critically damped springs for pulling and recovery. Tests cover timestep subdivision for fixed targets, spring convergence, field continuity, Snell refraction/total internal reflection, invalid inputs and disposal. Starting another drag or pulse while paused with existing deformation no longer changes the rendered anchor until playback resumes. Both new materials avoid undefined reversed-edge GLSL smoothstep calls.

公共手势策略把单指/左键分配给场景，Shift/右键分配给相机，双指保留缩放。起始为 Shift 旋转时，即使中途松开 Shift，也不会同时触发场扰动。鼠标和触摸输入在暂停时只记录目标，reset 清除已渲染和待处理的扰动。

Shared gesture policy assigns one finger/left mouse to the field, Shift/right mouse to orbit, and two fingers to zoom. A drag begun as Shift-orbit cannot simultaneously perturb the field when Shift is released. Paused mouse/touch input records targets only, and reset clears both rendered and pending perturbations.

## 浏览器结果 / Browser results

| 检查 / Check | 结果 / Result | 证据 / Evidence |
|---|---|---|
| Chrome 离线 / Offline | 20/20；无错误、无远程请求 / no errors or remote requests | [offline](qa/offline-report.json) |
| 全目录预设 / All presets | 60 桌面 + 60 触控模拟 / desktop + touch | [presentation](qa/presentation-report.json) |
| 新场景边界 / New controls | 23 参数端点、6 动作、高/低画质 / bounds, actions, high/low | [effects](qa/effects-report.json) |
| 连续交互 / Pointer interaction | 等时鼠标与 CDP 触控轨迹改变图像，相机不动 / equal-time input changes pixels while camera stays fixed | [effects](qa/effects-report.json) |
| 暂停与重置 / Pause and reset | 暂停输入不改变 PNG；reset 的 PNG 逐字节一致 / frozen input, byte-identical reset PNG | [effects](qa/effects-report.json) |
| 相机 / Camera | Shift/右键、双指缩放、相机复位 / Shift/right orbit, pinch, reset | [effects](qa/effects-report.json) |
| 资源 / Resources | 24 次切换后 geometry/texture 计数稳定 / stable counts after 24 switches | [effects](qa/effects-report.json) |
| 手机布局 / Mobile layout | 390×844、DPR2 触控模拟、低画质，无横向溢出 / touch emulation, low quality, no overflow | [effects](qa/effects-report.json) |
| 启动失败 / Boot recovery | 缺失/损坏 bundle 显示 Trace ID 与恢复入口 / missing/broken bundle shows recovery | [offline](qa/offline-report.json) |

以上三个浏览器报告与截图索引均对应本报告末尾的最终 bundle SHA。桌面/手机最终截图已人工目视检查；手机粒子笔触补偿后，淡紫边缘与珊瑚色核心可辨，玻璃主体与控件均完整可见。

All three browser reports and the screenshot index match the final bundle hash below. Final desktop/mobile captures were visually inspected. Wider mobile strokes preserve lavender edges and coral centers, and both the glass subject and controls remain visible.

## 性能与模型边界 / Performance and model limits

环境：Apple M3 Pro，macOS arm64，headless Chrome 152.0.7977.83，1280×800、DPR1、高画质。每个场景在独立页面使用真实时钟播放约五秒，采样前关闭其他验收页面。

Environment: Apple M3 Pro, macOS arm64, headless Chrome 152.0.7977.83, 1280×800, DPR1, high quality. Each scene ran for about five real-clock seconds in its own page after other acceptance pages were closed.

| 实验 / Scene | 墙钟秒 / Wall seconds | 末尾短窗 / Final rolling sample |
|---|---:|---:|
| `particle-paint` | 5.164 | 60 FPS |
| `liquid-glass` | 5.160 | 60 FPS |

这些是默认参数的短时测量，不是持续热负载测试或 200 万粒子档保证。手机为 Mac 上的触控模拟，未测试 iOS/Android 真机性能。资源计数检查不替代完整堆/驱动泄漏分析。

These are brief measurements at default parameters, not sustained thermal benchmarks or guarantees for the two-million-particle setting. Mobile is emulated on the Mac; physical iOS/Android performance is untested. Resource counters do not replace exhaustive heap/driver leak analysis.

两项视觉依据是用户提供的静态截图，未核验作者原视频、源码或资源。粒子作品是原创程序图像；液态玻璃是几何/光学近似，不是 TSL/WebGPU 流体求解、质量守恒模拟或新的数学结构。透明排序、多次内部反射、焦散与真实体积云不在本模型中。详细范围见 [粒子模型](models/particle-paint.md) 与 [玻璃模型](models/liquid-glass.md)。

Both effects use supplied static screenshots as visual references; the original videos, source code and assets have not been verified. Particle compositions are original procedural imagery. Glass is a geometry/optics approximation rather than a TSL/WebGPU fluid solver, mass-conserving simulation or new mathematical structure. Per-particle sorting, repeated internal reflections, caustics and true volumetric clouds are outside the models. See the model notes for details.

## 产物与复验 / Artifacts and reproduction

20 张 1280×800 JPEG 共 1,998,908 bytes；两张新作分别为 99,452 与 96,850 bytes。图集与索引记录参数、seed、相机、来源、源码和图片 SHA。同一浏览器会话的 reset 图像可逐字节复现，不承诺跨 GPU/字体的像素一致。截图使用虚拟时钟，画面 FPS 不作为性能证据。

20 JPEGs at 1280×800 total 1,998,908 bytes; the two additions are 99,452 and 96,850 bytes. The gallery and manifest record parameters, seeds, cameras, sources, code and image hashes. Reset pixels reproduce within a browser session, without a cross-GPU/font guarantee. Screenshots use virtual time; displayed FPS is not performance evidence.

[图集 / Gallery](EXAMPLES.md) · [截图索引 / Manifest](screenshots/manifest.json)

```sh
npm test
npm run build
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/offline-check.mjs
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/presentation-check.mjs
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/effects-check.mjs
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/capture-examples.mjs
```

Offline bundle: 938,084 bytes. SHA-256:

`8877513a37e9ec287cbe2094182b554466cba71cf0cb2870d55edf02d5ec5699`

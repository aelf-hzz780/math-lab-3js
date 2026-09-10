# FORMA 系统设计 / System Design

## 目标与边界 / Scope

FORMA 是独立的静态 Three.js 数学实验室，包含十个可运行、可交互、可解释的实验。此公开仓库已启用 Git，未使用 Spec Kitty。应用没有账户、后端、模型 API 或运行时外部资源依赖；研究来源链接仅在主动打开时访问外部网站。

FORMA is a standalone static Three.js mathematics lab with ten runnable, interactive and documented experiments. This public repository uses Git and does not use Spec Kitty. The application has no accounts, backend, model API or external runtime dependencies. Research links open external sites only when followed.

## 分层与设计选择 / Layers and Design Choices

`src/catalog.js` 是实验注册表，负责导航元数据与模块加载；`src/app.js` 编排界面、参数、时钟和活动实例；`src/math/` 保存可独立测试的数学计算；`src/experiments/` 将计算结果适配到 Three.js；`data/` 保存研究构造的固定数据；`vendor/` 固定 Three.js r180 与 Hat 上游生成器。具体文件导航见 [AI_GUIDE.md](AI_GUIDE.md)。

`src/catalog.js` registers navigation metadata and module loaders. `src/app.js` orchestrates the UI, parameters, clock and active instance. `src/math/` contains independently testable calculations, `src/experiments/` adapts results to Three.js, and `data/` holds fixed research datasets. `vendor/` pins Three.js r180 and the upstream Hat generator. See [AI_GUIDE.md](AI_GUIDE.md) for file navigation.

注册表与场景适配器使新实验通过统一接口接入，避免在应用控制器中加入数学算法分支。实验通过 `onMetrics` 发布测量，不直接控制全局 DOM；数学层不依赖 renderer。源码选择原生 ESM，避免为当前规模引入 React。交付使用 esbuild 0.25.10 生成的 classic IIFE，将所有实验和 JSON 数据打包，以支持直接双击 `index.html`。

The registry and scene adapters connect experiments through one interface, keeping mathematical branches out of the application controller. Experiments report measurements through `onMetrics` rather than manipulating global DOM, and the math layer does not depend on a renderer. Native ESM keeps the source lightweight without React. The delivered classic IIFE, built with esbuild 0.25.10, embeds all experiments and JSON data so `index.html` also works when opened directly.

## 实验接口与状态 / Experiment Interface and State

实验模块导出描述对象和实例工厂；`action`、`pick` 为可选交互方法。

Each experiment exports a definition and instance factory. `action` and `pick` are optional interaction methods.

```js
export const definition = {
  id, title, enTitle, kicker, year, category,
  description, formula, explanation, limitations,
  parameters: [{key, label, type, value, min, max, step, options}],
  presets: [{label, params}], actions: [{key, label}], sources: [{label, url}]
};

export function createExperiment({
  scene, camera, quality, seed, params, onMetrics, setCamera
}) {
  return {update, setParameters, reset, dispose, action, pick};
}
```

`createExperiment` 可以返回 Promise。`update(dt,time)` 使用秒，应用每帧推进量最多 0.05 秒；海水内部以 1/120 秒固定步长积分。`setParameters` 接收完整参数，`reset(seed)` 恢复当前参数下的初态，`dispose()` 释放实例自有资源。`pick` 接收 Three.js Raycaster。动作和点选可以返回 `{params?, seed?}`，由应用同步控件与会话内保存的状态。

`createExperiment` may return a Promise. `update(dt,time)` uses seconds, with the application limiting each step to 0.05 seconds; ocean integration uses internal fixed steps of 1/120 second. `setParameters` receives the full parameter object, `reset(seed)` restores initial state under current parameters, and `dispose()` releases instance-owned resources. `pick` receives a Three.js Raycaster. Actions and picking can return `{params?, seed?}` for the application to synchronize controls and session state.

参数经过统一有限值、范围与选项验证；select 保留声明中的 string/number 类型。种子是无符号 32 位整数。实验加载期间禁用相关控件，递增 epoch 丢弃过时的异步结果、测量和相机回调，并释放过时实例。预设与手动调参使用同一验证入口。

Parameters pass shared finite-value, range and option validation; select values retain their declared string or number type. Seeds are unsigned 32-bit integers. Experiment controls are disabled during loading. An incrementing epoch rejects stale asynchronous results, measurements and camera callbacks, and stale instances are disposed. Presets use the same validation path as manual controls.

## 数学与视觉边界 / Mathematical and Visual Boundaries

物理实验采用各自标明的简化模型：Burgers 解析流场、Born rule 概率、阻力下的解析火花轨迹、程序化沙丘、深水波叠加与多点浮力。尾流、水花和发光属于明确标注的视觉近似。N–S 纺锤实验仅是有限参数的机制示意，不能用于推断原论文速度场、PDE 不可压缩性、有限能量或奇点证明；来源和公式见 [NS_MODEL.md](NS_MODEL.md)。

Physical experiments use their stated simplified models: a Burgers analytic field, Born-rule probabilities, analytic spark trajectories with drag, procedural dunes, and deep-water wave superposition with multipoint buoyancy. Wakes, splashes and glow are identified visual approximations. The N–S spindle is a finite parametric mechanism illustration; it does not establish the paper's velocity field, PDE incompressibility, finite energy or singularity proof. See [NS_MODEL.md](NS_MODEL.md) for sources and formulas.

接吻构型保留三套 604 点的精确系数，Kakeya 使用有限域生成规则，MAX-4-CUT 使用完整的 19 节点、155 边加权表，Hat 使用正式 substitution rules。视觉升级可以改变灯光、材质和相机，不能为了风格扭曲这些精确构造。高维投影必须说明距离失真，有限铺砌必须与无限非周期结构区分。来源、版本与验证依据见 [CONSTRUCTIONS.md](CONSTRUCTIONS.md)、[RESEARCH.md](RESEARCH.md) 和 [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md)。

Kissing configurations retain exact coefficients for all three 604-point constructions. Kakeya uses finite-field generation rules, MAX-4-CUT uses the complete weighted table of 19 nodes and 155 edges, and Hat uses the formal substitution rules. Visual changes may adjust lighting, materials and cameras, but must not distort these exact constructions for style. High-dimensional projection must disclose distance distortion, and finite patches must be distinguished from infinite aperiodic tilings. Sources, versions and verification details are in [CONSTRUCTIONS.md](CONSTRUCTIONS.md), [RESEARCH.md](RESEARCH.md) and [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).

## 性能与资源生命周期 / Performance and Resource Lifecycle

应用共享一个 renderer，同一时间只运行一个实验。高画质 DPR 上限 1.75，低画质上限 1，并减少网格、流管或粒子数。几何采用合并、实例化和固定容量缓冲；高频更新保持线性规模。接吻构型的 O(n²) 精确审计仅限首次加载并缓存，n 固定为 604，不在动画循环全配对。MAX-4-CUT 的评分始终扫描完整 155 条边，边权过滤只影响显示。

The application shares one renderer and runs one experiment at a time. Pixel ratio is capped at 1.75 in high quality and 1 in low quality, which also reduces grids, tubes or particle counts. Geometry uses merging, instancing and fixed-capacity buffers; frequent updates remain linear in scene size. The O(n²) exact audit of kissing configurations is limited to initial loading and cached, with n fixed at 604; it never runs as all-pairs work per frame. MAX-4-CUT scoring always includes all 155 edges; filtering only changes their display.

观赏模式与实验台共享状态与控件，手机使用抽屉面板。`CameraMotion` 将镜头动画与数学状态分离，手动操作后等待 5 秒，暂停及低动态偏好停止自动镜头。高画质 `GlowRenderer` 使用一个全尺寸场景目标和两个三分之一尺寸模糊目标，低画质直接渲染。其固定三个纹理目标不会随实验切换累加。

Immersive and workbench modes share state and controls, with drawer panels on mobile. `CameraMotion` separates camera animation from mathematical state, waits five seconds after manual input, and stops automatic movement when paused or reduced motion is preferred. High-quality `GlowRenderer` uses one full-size scene target and two one-third-size blur targets; low quality renders directly. Its three fixed texture targets do not accumulate across experiment switches.

隐藏页面停止模拟推进与绘制，恢复时重新取墙钟基准。`disposeGroup` 去重释放 geometry、material、texture，包括 shader uniforms 中的纹理。实验切换清理 render lists，页面退出释放监听器、ResizeObserver、动画帧、提示计时器、后处理与 renderer。缓存研究数据只读，实例之间不共享自有图形资源。

Hidden pages stop simulation advancement and rendering, and reset the wall-clock baseline on return. `disposeGroup` deduplicates and releases geometries, materials and textures, including textures in shader uniforms. Switching clears render lists; page exit releases listeners, the ResizeObserver, animation frames, toast timer, postprocessing and renderer. Cached research data is read-only, and instances do not share owned graphics resources.

## 启动、异常与离线构建 / Startup, Errors and Offline Build

`src/bootstrap.js` 是独立普通脚本，在应用加载前监听未捕获错误、Promise 拒绝和 20 秒启动超时。应用完成首个场景或显示降级信息后解除守护。bundle 缺失或无法执行时，用户会看到可重试的错误信息，不会永久停留在构建提示。WebGL 不可用时仍可阅读实验定义和来源。

`src/bootstrap.js` is a separate classic script that watches uncaught errors, rejected Promises and a 20-second startup timeout before the application loads. The application clears this guard after the first scene or a fallback message. A missing or unusable bundle produces a retryable message rather than an indefinite loading screen. Experiment definitions and sources remain readable when WebGL is unavailable.

加载、参数、动作、点选和帧循环错误由应用统一捕获，WebGL context loss 和 shader 编译也有错误路径。本项目没有分布式服务，使用 Web Crypto UUID 或本地后缀生成 Trace ID，界面显示编号，控制台记录详情。实例销毁错误记录在控制台，应用继续清理其余场景资源。

The application catches errors from loading, parameters, actions, picking and frame updates, with explicit paths for WebGL context loss and shader compilation. There are no distributed services, so local Trace IDs use a Web Crypto UUID or a local fallback suffix. The UI shows the identifier and the console records details. Disposal errors are logged while cleanup continues for the remaining scene resources.

`npm ci` 安装锁定的构建工具，`npm run build` 重新生成 `dist/app.js` 和 `dist/manifest.json`。构建验证全部注册实验、两份 JSON 数据已打包且没有外部运行时 imports，清单保存 SHA-256。源码更改后必须重新构建。完整目录可以直接打开 `index.html`，也可通过 `npm start` 在 `127.0.0.1:4174` 预览。`serve.js` 只处理 GET/HEAD，并检查路径边界和 realpath。

`npm ci` installs the locked build tool, and `npm run build` regenerates `dist/app.js` and `dist/manifest.json`. The build verifies that every registered experiment and both JSON datasets are embedded, with no external runtime imports, and records a SHA-256 checksum. Source changes require rebuilding. Open `index.html` from the complete directory, or run `npm start` for a preview at `127.0.0.1:4174`. `serve.js` handles GET/HEAD only and checks path containment and real paths.

## 验证与发布 / Validation and Delivery

`npm test` 检查纯数学、状态和构造数据。浏览器脚本检查离线启动、交互、窄屏、导出和资源稳定性；截图复现入口为 `scripts/capture-examples.mjs`。截图索引与图集见 [AI_GUIDE.md](AI_GUIDE.md)，既有测量范围见 [QA_REPORT.md](QA_REPORT.md)。性能记录属于指定设备与画质的测量，不能推广为所有手机的帧率保证。

`npm test` checks pure mathematics, state and construction data. Browser scripts check offline startup, interactions, narrow screens, exports and resource stability; `scripts/capture-examples.mjs` reproduces the screenshot gallery. See [AI_GUIDE.md](AI_GUIDE.md) for image retrieval and [QA_REPORT.md](QA_REPORT.md) for the scope of recorded checks. Performance measurements apply to their documented device and quality, not to all phones.

仓库交付包含源码、构建产物、来源与验证资料。部署为静态站点时应发布完整的同一版本目录，回滚恢复上一版本；不需要数据库迁移。研究状态是固定日期快照，后续更新必须重新核验引用文献与构造，不能静默替换数据或把公告声明升级为已独立验证的结论。

The repository delivers source, built assets, provenance and validation records. Static hosting should deploy a complete, consistent version and roll back by restoring the prior version; no database migration is required. Research status is a dated snapshot. Updates must recheck cited literature and constructions, without silently replacing data or presenting announced claims as independently verified conclusions.

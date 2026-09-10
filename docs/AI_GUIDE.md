# AI 检索与复现指南 / AI Retrieval and Reproduction Guide

从截图找效果时，先读取 [`screenshots/manifest.json`](screenshots/manifest.json) 的机器索引，再查看 [`EXAMPLES.md`](EXAMPLES.md) 图集并打开对应图片。索引用于定位和复现实际渲染，不应只根据缩略图或文件名推断数学含义。效果参数、公式和适用范围的权威入口是各实验模块的 `definition`。

To find an effect by appearance, read the machine index in [`screenshots/manifest.json`](screenshots/manifest.json), inspect the gallery in [`EXAMPLES.md`](EXAMPLES.md), and open the relevant image. Use the index to locate and reproduce actual renders rather than inferring mathematics from thumbnails or filenames alone. Each experiment module's `definition` is the source for its parameters, formulas and limitations.

## 从画面到源码 / From Image to Source

路由使用 `index.html#<id>`；每个 ID 对应 `src/experiments/<id>.js` 场景和 `src/math/<id>.js` 计算层。导航顺序由 [`src/catalog.js`](../src/catalog.js) 决定。以下表格也可作为关键词映射。

Routes use `index.html#<id>`. Each ID maps to a scene at `src/experiments/<id>.js` and mathematics at `src/math/<id>.js`. [`src/catalog.js`](../src/catalog.js) defines navigation order. The table also provides visual search keywords.

| ID / Route | 画面关键词 / Visual keywords | Scene | Math |
| --- | --- | --- | --- |
| `navier` | N–S、青绿琥珀纺锤流管 / teal-and-amber spindle tubes | [navier.js](../src/experiments/navier.js) | [navier.js](../src/math/navier.js) |
| `vortex` | 有限核、双向拉伸、流线 / finite core, axial strain, streamlines | [vortex.js](../src/experiments/vortex.js) | [vortex.js](../src/math/vortex.js) |
| `quantum` | 概率曲面、纠缠、测量 / probability surface, entanglement, measurement | [quantum.js](../src/experiments/quantum.js) | [quantum.js](../src/math/quantum.js) |
| `dunes` | 金色沙丘、细条纹 / golden dunes, fine ripples | [dunes.js](../src/experiments/dunes.js) | [dunes.js](../src/math/dunes.js) |
| `sparks` | 发光粒子、火花、拖尾 / glowing sparks and trails | [sparks.js](../src/experiments/sparks.js) | [sparks.js](../src/math/sparks.js) |
| `ocean` | 海水、小船、浮力、水花 / ocean, boat, buoyancy, splashes | [ocean.js](../src/experiments/ocean.js) | [ocean.js](../src/math/ocean.js) |
| `kissing` | 604 点、高维投影、接触邻居 / 604 points, projection, contacts | [kissing.js](../src/experiments/kissing.js) | [kissing.js](../src/math/kissing.js) |
| `kakeya` | 有限域、模网格、直线覆盖 / finite field, modular grid, line coverage | [kakeya.js](../src/experiments/kakeya.js) | [kakeya.js](../src/math/kakeya.js) |
| `maxcut` | 四色加权图、节点、跨组边 / four-color weighted graph, cut edges | [maxcut.js](../src/experiments/maxcut.js) | [maxcut.js](../src/math/maxcut.js) |
| `hat` | 非周期铺砌、帽子单块、镜像 / aperiodic Hat tiles, reflections | [hat.js](../src/experiments/hat.js) | [hat.js](../src/math/hat.js) |
| `real-kakeya` | 王虹、实数方向、管束、重叠 / Hong Wang, real directions, tube overlap | [real-kakeya.js](../src/experiments/real-kakeya.js) | [real-kakeya.js](../src/math/real-kakeya.js) |
| `boltzmann` | 邓煜、硬球、碰撞 DAG、统计 / Yu Deng, hard spheres, collision DAG | [boltzmann.js](../src/experiments/boltzmann.js) | [boltzmann.js](../src/math/boltzmann.js) |
| `torus-knot` | Pardon、环面结、短弧、弦、link / Pardon, knots, arcs, chords, links | [torus-knot.js](../src/experiments/torus-knot.js) | [torus-knot.js](../src/math/torus-knot.js) |
| `moduli` | Tsimerman、复环面、晶格、CM、基本域 / Tsimerman, complex tori, lattices, CM | [moduli.js](../src/experiments/moduli.js) | [moduli.js](../src/math/moduli.js) |
| `noperthedron` | 多面体、Rupert、穿越、投影 / polyhedron, Rupert, passage, projections | [noperthedron.js](../src/experiments/noperthedron.js) | [noperthedron.js](../src/math/noperthedron.js) |
| `e8` | Viazovska、八维、240根、对称 / Viazovska, eight dimensions, 240 roots | [e8.js](../src/experiments/e8.js) | [e8.js](../src/math/e8.js) |
| `matroid` | June Huh、拟阵、生成树、Lorentzian、Hessian / matroids, spanning trees, Lorentzian | [matroid.js](../src/experiments/matroid.js) | [matroid.js](../src/math/matroid.js) |

共享交互在 [`src/app.js`](../src/app.js)，材质与几何主要在各场景文件，共享泛光在 [`src/core/glow.js`](../src/core/glow.js)，镜头策略在 [`src/core/presentation.js`](../src/core/presentation.js)，布局在 [`style.css`](../style.css)。增加实验时接入注册表与统一生命周期；完整接口见 [`SDD.md`](SDD.md)。

Shared interactions live in [`src/app.js`](../src/app.js); most materials and geometry live in scene files. Shared glow is in [`src/core/glow.js`](../src/core/glow.js), camera policy in [`src/core/presentation.js`](../src/core/presentation.js), and layout in [`style.css`](../style.css). Add experiments through the registry and common lifecycle; [`SDD.md`](SDD.md) documents the interface.

## 重建与截图 / Rebuild and Capture

源码更改后运行下面的命令。`PLAYWRIGHT_MODULE` 指向外部安装的 Playwright ESM 入口；它只用于浏览器验证和截图，不是应用运行时依赖。截图脚本与机器索引记录各自的捕获条件，以它们的实际配置为准。

Run the following after changing source. `PLAYWRIGHT_MODULE` points to an externally installed Playwright ESM entry; it is used only for browser validation and capture, not by the running application. Follow the capture script and machine index for the recorded capture conditions.

```sh
npm ci
npm test
npm run build
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/capture-examples.mjs
```

运行应用无需 npm 服务或模型 API：完整目录的 `index.html` 可直接打开，也可以运行 `npm start` 使用本地 HTTP 预览。Three.js、Hat 生成器和研究数据均为本地固定版本。不要手改 `dist/app.js`；改源码后重新 build，并保留 [`dist/manifest.json`](../dist/manifest.json) 的构建校验信息。

The application requires neither an npm server nor a model API: open `index.html` from the complete directory, or use `npm start` for a local HTTP preview. Three.js, the Hat generator and research datasets are fixed local assets. Do not edit `dist/app.js` manually; rebuild source and retain the build verification information in [`dist/manifest.json`](../dist/manifest.json).

## 保持数学边界 / Preserve Mathematical Boundaries

新增研究和获奖年份见 [ADDITIONS.md](ADDITIONS.md)。实数 Kakeya 与有限域 Kakeya 是不同实验。Pardon 的环面结结果是 2011 年，Tsimerman 的论文为 2015 v5，E8 最密证明为 2016 年；不能把获奖年份写成结构发明年份。硬球碰撞历史不是原论文 molecule 切割算法，三维环面不是平坦复环面的等距嵌入。七项均不归因于 AI 发现。

See [ADDITIONS.md](ADDITIONS.md) for research and award dates. Real-space and finite-field Kakeya are separate experiments. Pardon's knot result dates to 2011, Tsimerman's paper to 2015 v5, and E8 optimal packing to 2016; award dates are not invention dates. Collision histories do not implement the paper's molecule-cutting algorithm, and the embedded torus is not an isometric flat complex torus. No AI-discovery attribution is made for these seven topics.

N–S 画面是有限的教学机制示意，不是论文速度场、PDE 求解器或奇点证明。研究声明必须保留来源与核验日期，见 [`RESEARCH.md`](RESEARCH.md) 和 [`NS_MODEL.md`](NS_MODEL.md)。接吻构型精确系数、Kakeya 生成规则、完整 MAX-4-CUT 边表与 Hat substitution rules 不可为了视觉风格变形；可以改灯光、配色、相机和显示密度，但必须保持数学测量及来源说明正确。

The N–S image is a finite teaching illustration, not the paper's velocity field, a PDE solver or a singularity proof. Keep research claims attributed and dated; see [`RESEARCH.md`](RESEARCH.md) and [`NS_MODEL.md`](NS_MODEL.md). Do not deform exact kissing coefficients, Kakeya rules, the full MAX-4-CUT edge table or Hat substitution rules for visual style. Lighting, colors, cameras and display density may change, while mathematical measurements and source explanations must remain correct.

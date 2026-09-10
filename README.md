# FORMA · 数学实验室 / Math Lab

十个可以旋转、调参、测量的 Three.js 数学与物理实验。包含离线应用、精确构造数据、30 个视觉预设与真实效果截图。

Ten interactive Three.js experiments with an offline app, exact construction data, 30 visual presets, and screenshots captured from the running application.

**[效果示例 / Examples](docs/EXAMPLES.md) · [AI 导航 / AI guide](docs/AI_GUIDE.md) · [JSON 示例索引 / Example manifest](docs/screenshots/manifest.json) · [设计 / Architecture](docs/SDD.md)**

## 效果画廊 / Gallery

每张图片为 **1280×800 JPEG**，点开可查看完整尺寸。图片来自本仓库实际运行的应用；参数、相机、模拟时间、来源与图片校验值均记录在 JSON 索引中。

Each image is a **1280×800 JPEG** from this application. Open an image for the full size; the JSON index records parameters, camera, simulation time, sources, and image checksums.

| N–S · 涡旋之心 / Vortex concentration | 有限核涡旋 / Burgers vortex |
|---|---|
| [![N–S 流管几何示意 / N–S geometric illustration](docs/screenshots/01-navier.jpg)](docs/screenshots/01-navier.jpg) | [![Burgers 涡旋 / Burgers vortex](docs/screenshots/02-vortex.jpg)](docs/screenshots/02-vortex.jpg) |
| **量子纠缠 / Quantum correlations** | **风成沙丘 / Sand dunes** |
| [![量子概率曲面 / Quantum probability surface](docs/screenshots/03-quantum.jpg)](docs/screenshots/03-quantum.jpg) | [![程序化沙丘 / Procedural dunes](docs/screenshots/04-dunes.jpg)](docs/screenshots/04-dunes.jpg) |
| **火花轨迹 / Spark trails** | **海水与尾流 / Ocean and wakes** |
| [![火花喷泉 / Spark fountain](docs/screenshots/05-sparks.jpg)](docs/screenshots/05-sparks.jpg) | [![海水浮力 / Ocean buoyancy](docs/screenshots/06-ocean.jpg)](docs/screenshots/06-ocean.jpg) |
| **604 点接吻构型 / 604-point configuration** | **有限域 Kakeya / Finite-field Kakeya** |
| [![11维接吻构型的三维投影 / 11D kissing configuration projected to 3D](docs/screenshots/07-kissing.jpg)](docs/screenshots/07-kissing.jpg) | [![有限域点集 / Finite-field point set](docs/screenshots/08-kakeya.jpg)](docs/screenshots/08-kakeya.jpg) |
| **AI 图构造 / MAX-4-CUT graph** | **Hat 非周期铺砌 / Aperiodic Hat tiling** |
| [![MAX-4-CUT加权图 / MAX-4-CUT weighted graph](docs/screenshots/09-maxcut.jpg)](docs/screenshots/09-maxcut.jpg) | [![Hat铺砌 / Hat tiling](docs/screenshots/10-hat.jpg)](docs/screenshots/10-hat.jpg) |

N–S 图是有界的几何机制示意；Burgers、海水等是明确说明的教学模型。接吻构型、Kakeya、图边表与 Hat 使用可验证的原始数据或生成规则。模型范围与研究声明见 [研究说明](docs/RESEARCH.md) 和 [N–S 模型](docs/NS_MODEL.md)。

The N–S scene is a bounded geometric illustration; Burgers and ocean scenes are documented teaching models. Kissing configurations, Kakeya sets, graph edges, and Hat tilings use verifiable data or construction rules. See the research and model notes for their limits.

## 运行 / Run

```sh
git clone https://github.com/aelf-hzz780/math-lab-3js.git
cd math-lab-3js
```

**直接双击 `index.html` 即可在 Chrome 离线运行。** 保持整个文件夹完整，已有 `dist/app.js` 包含全部场景和数据；不需要服务器、安装依赖、CDN 或模型 API。

**Open `index.html` directly in Chrome for offline use.** Keep the folder intact: the included `dist/app.js` embeds all scenes and data. No server, package installation, CDN, or model API is needed to view the app.

也可以使用本地服务（开发与测试推荐 Node.js 22+）：

Alternatively, start the local server (Node.js 22+ is recommended for development and tests):

```sh
npm start
```

打开 / Open <http://127.0.0.1:4174/#navier>。通过 `PORT=4200 npm start` 改变端口 / Use `PORT=4200 npm start` to change the port.

## 操作与定位 / Controls and navigation

- 拖动旋转，滚轮或双指缩放；右上角可以导出 PNG。 / Drag to orbit; use the wheel or pinch to zoom; export a PNG from the upper right.
- “进入实验台”展开参数与数学原理；观赏模式提供预设和快速导航。 / Switch to the workbench for parameters and theory; the gallery offers presets and quick navigation.
- `Space` 播放/暂停，`R` 重置，`F` 切换模式，`1–9` 和 `0` 切换十个实验。 / `Space` plays or pauses, `R` resets, `F` switches modes, and `1–9` plus `0` select experiments.
- 自动镜头可关闭，拖动后停留 5 秒；低动态偏好默认暂停。 / Automatic camera motion can be disabled, yields for 5 seconds after input, and starts disabled with reduced-motion preferences.

| ID / URL hash | 实验 / Experiment | 场景源码 / Scene |
|---|---|---|
| `#navier` | N–S 涡旋机制 / Vortex illustration | [navier.js](src/experiments/navier.js) |
| `#vortex` | Burgers 解析涡旋 / Analytic vortex | [vortex.js](src/experiments/vortex.js) |
| `#quantum` | Born 概率与 CHSH / Probabilities and CHSH | [quantum.js](src/experiments/quantum.js) |
| `#dunes` | 风成沙丘 / Aeolian landscape | [dunes.js](src/experiments/dunes.js) |
| `#sparks` | 重力与阻力 / Gravity and drag | [sparks.js](src/experiments/sparks.js) |
| `#ocean` | 深水波、浮力与尾流 / Waves, buoyancy, wakes | [ocean.js](src/experiments/ocean.js) |
| `#kissing` | 三套 11D 604 点构型 / Three 604-point configurations | [kissing.js](src/experiments/kissing.js) |
| `#kakeya` | 模素数网格与直线 / Modular grids and lines | [kakeya.js](src/experiments/kakeya.js) |
| `#maxcut` | 19 节点加权图 / 19-node weighted graph | [maxcut.js](src/experiments/maxcut.js) |
| `#hat` | 作者正式替换规则 / Original substitution rules | [hat.js](src/experiments/hat.js) |

## 修改、测试与截图 / Build, test, and capture

源码采用原生 ESM 分层，Three.js 固定为 r180。修改源码后必须重建离线入口；esbuild 是固定的开发依赖，运行时不需要它。

Source code uses native ESM with local Three.js r180. Rebuild after source edits to update the offline entry; the pinned esbuild dependency is needed only for development.

```sh
npm ci
npm test
npm run build
```

当前基线：49 项数学与状态测试，Chrome 离线 10/10 场景、60 次预设点击和 30 次切换验收。测试条件与限制见 [验收报告](docs/QA_REPORT.md)。

Current baseline: 49 math/state tests, all 10 scenes verified in offline Chrome, 60 preset clicks, and 30 scene switches. See the validation report for conditions and limits.

浏览器验收与截图需要 Google Chrome 和 Playwright 1.62.1；它们不是应用运行依赖。

Browser checks and screenshot generation require Google Chrome and Playwright 1.62.1; neither is an app runtime dependency.

```sh
npm install --no-save --package-lock=false playwright@1.62.1
# If Chrome is not already installed:
npx playwright install chrome
npm run capture:examples
npm run check:offline
```

已有 Playwright 时，可设置 `PLAYWRIGHT_MODULE` 为模块入口。完整交互验收使用 `node scripts/interaction-check.mjs`（需要本地服务在 4174 运行），观赏交互验收使用 `node scripts/presentation-check.mjs`（直接使用离线入口）。

Set `PLAYWRIGHT_MODULE` to an existing module entry if needed. Run `node scripts/interaction-check.mjs` against the local server on port 4174, or `node scripts/presentation-check.mjs` directly against the offline entry.

## 资料与来源 / Documentation and sources

- [AI_GUIDE.md](docs/AI_GUIDE.md) · 示例检索与源码地图 / Retrieval and source map.
- [EXAMPLES.md](docs/EXAMPLES.md) · 十项完整截图与复现信息 / Full screenshots and reproduction details.
- [SDD.md](docs/SDD.md) · 中英架构与生命周期 / Bilingual architecture and lifecycle.
- [CONSTRUCTIONS.md](docs/CONSTRUCTIONS.md) · 精确坐标、规则、哈希 / Exact coordinates, rules, and hashes.
- [RESEARCH.md](docs/RESEARCH.md) / [NS_MODEL.md](docs/NS_MODEL.md) · 研究快照与模型范围 / Research snapshot and model limits.
- [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) · Three.js、Hat、Station 的来源与许可 / Upstream attribution and licenses.

研究说明保留日期快照；不应把效果截图作为新的数学证明。仓库包含静态离线产物，可以独立托管；此次发布为代码与示例仓库。

Research notes are dated snapshots; screenshots are not mathematical proofs. The repository includes static offline artifacts that can be hosted independently; this publication provides code and visual examples.

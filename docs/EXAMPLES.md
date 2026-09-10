# FORMA · 十个真实示例 / Ten real examples

以下图片直接截取自本仓库的 Three.js 应用，包含实际界面与渲染结果。每张为 1280 × 800 的 JPEG；共用 seed 42、默认参数、高画质和固定镜头。它们不是原始上传照片，也不是生成式效果图。

These images are actual screenshots of this repository’s Three.js application, including the interface and rendered scenes. Every JPEG is 1280 × 800, using seed 42, default parameters, high quality, and a fixed camera. They are neither uploaded reference photographs nor generated mockups.

[机器可读索引 / Machine-readable index](screenshots/manifest.json) 提供每个示例的双语名称、参数、模型边界、研究来源、源码路径、原始图片 URL 与 SHA-256。相同 seed 与参数可复现模型状态；不同 GPU、浏览器和字体可能产生像素差异。

The machine-readable index includes bilingual names, parameters, model limits, research sources, source paths, raw image URLs, and SHA-256 hashes. The same seed and parameters reproduce model state; GPU, browser, and font differences can affect pixels.

截图使用虚拟时钟，画面中的 FPS 不作为性能测量；性能条件见 [QA_REPORT.md](QA_REPORT.md)。

Captures use a virtual clock; the displayed FPS is not a performance measurement. See QA_REPORT.md for measured conditions.

## 重新生成 / Regenerate

先安装构建依赖与 Playwright，再安装或使用本机 Google Chrome。截图脚本不连接模型 API，也不需要运行本地服务器。已有 Playwright 时，可通过 `PLAYWRIGHT_MODULE` 指向其模块入口。

Install the build dependencies and Playwright, then install or use a local Google Chrome. The capture script requires no model API or local server. If Playwright is already available elsewhere, set `PLAYWRIGHT_MODULE` to its module entry point.

```sh
npm ci
npm install --no-save --package-lock=false playwright@1.62.1
npx playwright install chrome
npm run build
node scripts/capture-examples.mjs
```

脚本开启低动态偏好，暂停自动镜头与模拟；海水单独推进 2,000 ms 的浏览器虚拟时间后暂停，以呈现航行尾流。实际模拟时间与相机坐标逐图记录在索引中。其他九项取时间 0；火花在时间 0 已按模型说明预热粒子池。

The script enables reduced motion and pauses both the camera and simulation. Only the ocean advances by 2,000 ms of browser virtual time before pausing to reveal its wake. The index records the actual simulation time and camera coordinates for each image. The other nine scenes use time 0; the particle model prewarms its pool as described in the app.

## 01 · N–S · 涡旋之心 / Navier–Stokes vortex concentration

![N–S · 涡旋之心 / Navier–Stokes vortex concentration](screenshots/01-navier.jpg)

青绿与琥珀色流管组成细长涡旋，示意收缩、旋转与轴向拉伸。

Teal and amber stream tubes form a spindle that illustrates contraction, rotation, and axial stretching.

模型边界：有限参数几何示意，不是 Navier–Stokes 数值求解器，也不是公告证明或原始速度场的复现。收缩始终有下界；循环接头是显示截断。不能从此图推出奇点、有限能量或完整流场的不可压缩性。截图中的 GPT6 ASTRA 面板属于社媒视觉参考，不视为官方计算数据。Clay 状态仅按 2026-09-09 的核验记录标为 Unsolved。

打开 / Open: `index.html#navier` · t = 0.000 s · seed = 42.

[场景 / Scene](../src/experiments/navier.js) · [数学 / Math](../src/math/navier.js) · [原始图片 / Raw JPEG](https://raw.githubusercontent.com/aelf-hzz780/math-lab-3js/main/docs/screenshots/01-navier.jpg)

- [2026-09-08 · OpenAI 研究公告与原图说明](https://openai.com/index/navier-stokes-solution/)
- [Clay Mathematics Institute · 问题与状态](https://www.claymath.org/millennium/navier-stokes-equation/)

## 02 · 有限核涡旋 / Finite-core Burgers vortex

![有限核涡旋 / Finite-core Burgers vortex](screenshots/02-vortex.jpg)

发光的螺旋流线环绕有限涡核，粒子展示径向收缩与轴向运动。

Glowing helical streamlines wrap a finite vortex core while tracers show radial contraction and axial motion.

模型边界：解析教学模型，不是 LBM、DNS 或 OpenAI 2026 证明的复现。所有有限正黏度、正拉伸参数下核心光滑；画面收缩不表示有限时间奇点。流线以有限时间与有限空间截断，边缘重新出现的点是可视化示踪粒子。

打开 / Open: `index.html#vortex` · t = 0.000 s · seed = 42.

[场景 / Scene](../src/experiments/vortex.js) · [数学 / Math](../src/math/vortex.js) · [原始图片 / Raw JPEG](https://raw.githubusercontent.com/aelf-hzz780/math-lab-3js/main/docs/screenshots/02-vortex.jpg)

- [Burgers vortex · 模型与方程](https://en.wikipedia.org/wiki/Burgers_vortex)
- [2026-09-08 · OpenAI 原始研究公告](https://openai.com/index/navier-stokes-solution/)
- [Clay Mathematics Institute · 问题与状态](https://www.claymath.org/millennium/navier-stokes-equation/)

## 03 · 量子纠缠 / Quantum entanglement probability surface

![量子纠缠 / Quantum entanglement probability surface](screenshots/03-quantum.jpg)

彩色概率曲面连接两端测量角度，展示双量子比特的联合概率。

A luminous probability surface maps two measurement angles to the joint outcome probability of two qubits.

模型边界：这是一张概率函数曲面，不是粒子的实际空间形状，也不是完整 Hilbert 空间的三维等价物。远端测量设置不改变本端边缘概率，不能用于超光速通信。改变任一参数会清空旧设置的采样统计。

打开 / Open: `index.html#quantum` · t = 0.000 s · seed = 42.

[场景 / Scene](../src/experiments/quantum.js) · [数学 / Math](../src/math/quantum.js) · [原始图片 / Raw JPEG](https://raw.githubusercontent.com/aelf-hzz780/math-lab-3js/main/docs/screenshots/03-quantum.jpg)

- [Bell 1964 · On the Einstein Podolsky Rosen paradox](https://doi.org/10.1103/PhysicsPhysiqueFizika.1.195)

## 04 · 风成沙丘 / Wind-shaped sand dunes

![风成沙丘 / Wind-shaped sand dunes](screenshots/04-dunes.jpg)

暖色掠射光照亮起伏沙脊与程序化细沙纹。

Warm grazing light reveals rolling dune crests and fine procedural sand ripples.

模型边界：这是可解释的程序化高度场，不求解沙粒输运方程，也不代表新发现的数学结构。移动速度是整体平移的演示参数；没有模拟侵蚀和崩塌。少量悬浮光点是用于表现风向的沙尘视觉层，不计算真实沙粒输运。

打开 / Open: `index.html#dunes` · t = 0.000 s · seed = 42.

[场景 / Scene](../src/experiments/dunes.js) · [数学 / Math](../src/math/dunes.js) · [原始图片 / Raw JPEG](https://raw.githubusercontent.com/aelf-hzz780/math-lab-3js/main/docs/screenshots/04-dunes.jpg)

- [Bagnold · The Physics of Blown Sand and Desert Dunes (1941)](https://doi.org/10.1007/978-94-009-5682-7)
- [GPU Gems · Improved Perlin Noise](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-5-implementing-improved-perlin-noise)

## 05 · 火花与轨迹 / Sparks and analytic particle trails

![火花与轨迹 / Sparks and analytic particle trails](screenshots/05-sparks.jpg)

金色火花形成喷泉，短拖尾描出重力与线性阻力下的运动。

A fountain of golden sparks leaves short trails governed by gravity and linear drag.

模型边界：用于解释运动和粒子系统，不模拟真实燃烧、热传导或复杂空气湍流。粒子互不碰撞；轨迹池持续循环，颜色与亮度是视觉编码。发射率受当前画质的粒子池预算限制，指标显示实际发射率。

打开 / Open: `index.html#sparks` · t = 0.000 s · seed = 42.

[场景 / Scene](../src/experiments/sparks.js) · [数学 / Math](../src/math/sparks.js) · [原始图片 / Raw JPEG](https://raw.githubusercontent.com/aelf-hzz780/math-lab-3js/main/docs/screenshots/05-sparks.jpg)

- [Linear drag · 解析运动模型](https://en.wikipedia.org/wiki/Projectile_motion#Trajectory_of_a_projectile_with_air_resistance)

## 06 · 海水与浮力 / Ocean waves, buoyancy, and wakes

![海水与浮力 / Ocean waves, buoyancy, and wakes](screenshots/06-ocean.jpg)

程序化小船穿过深水波叠加形成的水面，身后可见近似尾流与泡沫。

A procedural boat crosses superposed deep-water waves, leaving an approximate wake and foam.

模型边界：波面是线性深水波叠加，不是完整 Navier–Stokes 求解器。尾流采用约 19.47° 的 Kelvin 楔形视觉近似；泡沫和飞溅不反作用于波场，浮力采用离散船底和小角度近似。

打开 / Open: `index.html#ocean` · t = 2.000 s · seed = 42.

[场景 / Scene](../src/experiments/ocean.js) · [数学 / Math](../src/math/ocean.js) · [原始图片 / Raw JPEG](https://raw.githubusercontent.com/aelf-hzz780/math-lab-3js/main/docs/screenshots/06-ocean.jpg)

- [MIT · Deep Water Waves](https://web.mit.edu/fluids-modules/www/waves.html)
- [Kelvin ship-wave pattern · Encyclopedia of Mathematics](https://encyclopediaofmath.org/wiki/Kelvin_ship-wave_pattern)
- [GPU Gems · Effective Water Simulation](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-1-effective-water-simulation-physical-models)

## 07 · 11 维接吻构型 / 604-point kissing configuration in 11 dimensions

![11 维接吻构型 / 604-point kissing configuration in 11 dimensions](screenshots/07-kissing.jpg)

三维投影中的蓝金色点云显示 604 点构型，细线标出选中点的真实高维接触。

A blue and gold 3D projection shows a 604-point configuration; lines mark the selected point’s actual high-dimensional contacts.

模型边界：这是十一维结构的三维正交投影；画面距离与重叠不代表原空间中的距离。604 是下界，尚未宣称接吻数恰为 604。

打开 / Open: `index.html#kissing` · t = 0.000 s · seed = 42.

[场景 / Scene](../src/experiments/kissing.js) · [数学 / Math](../src/math/kissing.js) · [原始图片 / Raw JPEG](https://raw.githubusercontent.com/aelf-hzz780/math-lab-3js/main/docs/screenshots/07-kissing.jpg)

- [Station · 论文与三套精确构造](https://arxiv.org/abs/2608.23691)
- [原始坐标与验证证书](https://github.com/dualverse-ai/station_data_v2/tree/main/artifacts/kissing_number)

## 08 · 有限域 Kakeya 集 / Finite-field Kakeya set

![有限域 Kakeya 集 / Finite-field Kakeya set](screenshots/08-kakeya.jpg)

离散光点在模素数网格中排列，金色点突出一个方向的完整直线。

Discrete luminous points occupy a prime-modulus grid, with a complete line in one direction highlighted in gold.

模型边界：有限域里的直线是模运算点集。白色光点按参数 t 遍历整条直线，跨边界时不会画出误导性的欧式长线。该家族不代表每个 p 的最小可能点集。

打开 / Open: `index.html#kakeya` · t = 0.000 s · seed = 42.

[场景 / Scene](../src/experiments/kakeya.js) · [数学 / Math](../src/math/kakeya.js) · [原始图片 / Raw JPEG](https://raw.githubusercontent.com/aelf-hzz780/math-lab-3js/main/docs/screenshots/08-kakeya.jpg)

- [Station · 新无限家族论文](https://arxiv.org/abs/2608.23691)
- [精确公式与方向见证](https://github.com/dualverse-ai/station_data_v2/tree/main/artifacts/finite_kakeya)

## 09 · AI 图构造 / AI-discovered MAX-4-CUT graph

![AI 图构造 / AI-discovered MAX-4-CUT graph](screenshots/09-maxcut.jpg)

四色节点与加权边构成空间网络，明亮边表示当前着色切过的边。

Four-colored nodes and weighted edges form a spatial graph; bright edges cross the current color partition.

模型边界：这张图用于近似困难性的归约证明。当前着色与局部搜索只演示目标函数，不是完整归约证明，也不保证达到全局最优。三维布局不改变图的结构。

打开 / Open: `index.html#maxcut` · t = 0.000 s · seed = 42.

[场景 / Scene](../src/experiments/maxcut.js) · [数学 / Math](../src/math/maxcut.js) · [原始图片 / Raw JPEG](https://raw.githubusercontent.com/aelf-hzz780/math-lab-3js/main/docs/screenshots/09-maxcut.jpg)

- [AlphaEvolve · 原论文与附录 C.1](https://arxiv.org/html/2509.18057v7)
- [论文摘要与版本记录](https://arxiv.org/abs/2509.18057)

## 10 · Hat 非周期铺砌 / Aperiodic Hat tiling

![Hat 非周期铺砌 / Aperiodic Hat tiling](screenshots/10-hat.jpg)

轻度挤出的青绿色 Hat 拼块形成有限铺砌，金色拼块标出合法镜像。

Slightly extruded teal Hat tiles form a finite patch, with valid reflected tiles highlighted in gold.

模型边界：画面是无限非周期铺砌的一块有限区域；有限图案或动画本身不能证明非周期性。高度只用于展示，不属于原始平面数学定义。

打开 / Open: `index.html#hat` · t = 0.000 s · seed = 42.

[场景 / Scene](../src/experiments/hat.js) · [数学 / Math](../src/math/hat.js) · [原始图片 / Raw JPEG](https://raw.githubusercontent.com/aelf-hzz780/math-lab-3js/main/docs/screenshots/10-hat.jpg)

- [Hat · 作者与论文](https://cs.uwaterloo.ca/~csk/hat/)
- [BSD 3-Clause 原始生成器](https://github.com/isohedral/hatviz)

图像总大小 / Total image size: 1070 KiB. Bundle SHA-256: `9d5659452338acfa92ae1d198fa42a9ee937ba2937749f509f1b4d59bac7cadf`.

# 菲尔兹奖与新构造 / Fields Medal and New Structures

核验日期：2026-09-10。此次增加七项独立实验，目录共 17 项。构造、论文和获奖分别标注年份；获奖通常认可已有对象上的新定理与新方法。已核验资料未给出这七项成果的 AI 发现归因。

Verified on 2026-09-10. This edition adds seven experiments, bringing the catalog to 17. Construction, paper, and award dates are distinguished: medals often recognize new theorems about existing objects. Checked sources provide no AI-discovery attribution for these seven topics.

| 路由 / Route | 研究来源 / Research source | 实验与边界 / Experiment and limits |
|---|---|---|
| `#real-kakeya` | [Wang–Zahl, 2025](https://arxiv.org/abs/2502.17655), Hong Wang, Fields 2026 | 实数三维有限 δ 管束与覆盖体积估计；不等于有限域构造，不复现维数证明。 / Finite real-space tubes and sampled occupied volume; distinct from finite-field Kakeya, not a dimension proof. |
| `#boltzmann` | [Deng–Hani–Ma, 2024 / 2025 v3](https://arxiv.org/abs/2408.07818v3), Yu Deng, Fields 2026 | 硬球与碰撞历史图；不实现论文的累积量展开、molecule 切割算法或 Boltzmann–Grad 极限。 / Hard spheres and bounded histories, not cumulant expansion, molecule cutting, or the Boltzmann–Grad limit. |
| `#torus-knot` | [Pardon, 2011](https://arxiv.org/abs/1010.1972), Fields 2026 | 环面结/链环、选定点对的短弧与弦比；不等于全局 distortion，也不覆盖全部辛几何获奖工作。 / Torus knots/links and selected-pair arc/chord ratios, not global distortion or the entire symplectic portfolio. |
| `#moduli` | [Tsimerman, 2015 v5](https://arxiv.org/abs/1506.01466v5), Fields 2026 | g=1 模空间、SL₂(Z)、晶格与 CM 点；三维环面不是平坦复环面的等距嵌入。 / Genus-one moduli, modular transformations, lattices, and CM points; the torus is not an isometric flat embedding. |
| `#noperthedron` | [Steininger–Yurkevich, 2025 / 2026 v2](https://arxiv.org/abs/2508.18475v2) | 90 原始顶点与投影包含；有限浮点搜索不替代论文的全局计算机辅助证明。 / Original 90 vertices and projection containment; finite floating-point exploration does not replace the global proof. |
| `#e8` | [Viazovska, 2016](https://arxiv.org/abs/1603.04246), Fields 2022 | 240 个 E8 根及八维邻接；投影改变距离，根壳不等于无限晶格。 / 240 roots and true 8D adjacency; projection distorts distance and the shell is not the infinite lattice. |
| `#matroid` | [Brändén–Huh, Lorentzian polynomials](https://arxiv.org/abs/1902.03719), June Huh, Fields 2022 | 小图拟阵、基与基生成多项式；数值切片不替代一般理论证明。 / A graphic matroid, bases, and basis-generating polynomial; numerical slices do not prove the general theory. |

[IMU 2026](https://www.mathunion.org/imu-awards/fields-medal/fields-medals-2026)公布 Yu Deng、John Pardon、Jacob Tsimerman、Hong Wang 获奖。[IMU 2022](https://www.mathunion.org/imu-awards/fields-medal/fields-medals-2022)用于 E8 和拟阵的获奖背景。实验提供可视化入口，并非获奖工作的穷尽列表。

The official IMU 2026 list names Yu Deng, John Pardon, Jacob Tsimerman, and Hong Wang. The 2022 list supplies E8 and matroid award context. Experiments are visual entry points, not exhaustive accounts of the laureates' work.

## 交互与验证 / Interaction and Verification

每项均有三个预设、参数、测量、来源、暂停/重置和 PNG 导出。数学与场景分别在 `src/math/<id>.js` 和 `src/experiments/<id>.js`。截图为 1280×800 JPEG；seed、镜头和时间见 [机器索引](screenshots/manifest.json)。数学测试覆盖坐标、对称、投影、碰撞守恒、曲线积分、模变换、拟阵与多项式。浏览器验收的实测结果见 [QA_REPORT.md](QA_REPORT.md)。

Each experiment has three presets, parameters, measurements, sources, pause/reset, and PNG export. Math and scene modules are separate. Screenshots are 1280×800 JPEGs, with seed, camera, and time in the manifest. Tests cover coordinates, symmetry, projections, collision conservation, curve integration, modular transformations, matroids, and polynomials. Browser measurements are recorded in the QA report.

## 架构与交付 / Architecture and Delivery

沿用实验注册表与场景适配器，避免控制器堆积分支。高维邻接与三维支持面按模型缓存，动画使用固定容量缓冲区。Noperthedron 的 90 点三维支持面枚举是一次性预处理；姿态扫描以最多 30 Hz 更新二维投影凸包及包含余量。后者至多 90×90 次点边测试，规模固定，支持准确显示当前姿态的余量。

The registry and scene adapters avoid controller branches. High-dimensional adjacency and 3D supporting faces are cached by model; animation uses bounded buffers. Noperthedron supporting-face enumeration is one-time preprocessing. Pose scanning updates 2D projection hulls and margins at up to 30 Hz; containment uses at most 90×90 point-edge checks, a fixed small budget for reporting the current pose accurately.

继续使用原生 ESM、本地 Three.js 和离线 IIFE。另一方案是增加框架或远程数学服务，但这些小型确定性模型无需新的运行时依赖；代价是显式管理各场景资源生命周期。

Native ESM, local Three.js, and the offline IIFE remain. A framework or remote mathematics service would add unnecessary runtime dependencies for these bounded models; the tradeoff is explicit scene resource management.

工作在 `feature/fields-and-new-structures` 完成，通过 PR 交付。回滚时恢复上一版完整静态目录，使源码、bundle 和 manifest 同步。本次不增加后端、完整 PDE 求解器、形式化证明器或线上托管。

Work is delivered through a PR from `feature/fields-and-new-structures`. Roll back by restoring the previous full static directory, keeping source, bundle, and manifest consistent. This edition adds no backend, full PDE solver, formal prover, or hosting service.

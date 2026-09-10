# 实数三维 Kakeya 管束 / Real Three-dimensional Kakeya Tubes

本实验关联王虹与 Joshua Zahl 的 2025 年论文，以及王虹的 2026 年菲尔兹奖。研究来源已于 2026-09-10 核验：IMU 官方获奖名单和 [arXiv:2502.17655](https://arxiv.org/abs/2502.17655)。论文证明任意实数三维 Kakeya 集的 Hausdorff 与 Minkowski 维数均为 3。既有有限域 `kakeya` 实验是不同模型，不能替代此研究。

This experiment accompanies Hong Wang and Joshua Zahl's 2025 paper and Wang's 2026 Fields Medal. Sources checked on 2026-09-10 are the official IMU award list and [arXiv:2502.17655](https://arxiv.org/abs/2502.17655). The paper establishes Hausdorff and Minkowski dimension 3 for every Kakeya set in real three-dimensional space. The existing finite-field `kakeya` experiment concerns a different model.

方向为上半球黄金角采样的 48、96 或 144 个单位向量。每根管是长度 1 的线段的 δ 邻域，几何含两端半球。三种布局只平移中心而不改变方向或线段长度；并不声称这些布局是论文里的极值构造。并集体积用包围盒内固定 Halton 序列求积，高档 12,288 个采样点、低档 4,096 个。指标是数值估计，不提供严格误差上界或维数结论。

Directions are 48, 96 or 144 unit vectors sampled on the upper hemisphere using the golden angle. Each tube is the δ-neighborhood of a unit segment, including hemispherical caps. The layouts translate centers without changing direction or length and are not presented as extremal configurations from the paper. Union volume uses deterministic Halton quadrature inside a bounding box, with 12,288 samples in high quality and 4,096 in low quality. The measurement is a numerical estimate without a rigorous error bound or dimension conclusion.

有限方向及非零管径的可视化不能实现无限 Kakeya 集，也不是定理证明或反例；满维不等于正 Lebesgue 体积。体积估计只在参数变更时计算，复杂度 O(采样点数 × 管数)，动画只更新光点与被选中的方向。测试验证单位方向、单位线段、线段距离、单管解析体积的近似、重复管不改变并集与输入边界。

A finite collection with positive tube radius is neither an infinite Kakeya set nor a proof or counterexample. Full dimension does not imply positive Lebesgue volume. Volume estimation runs only on geometry changes, with O(samples × tubes) cost; animation only updates tracers and the selected direction. Tests cover unit directions and segments, segment distance, approximation of analytic single-capsule volume, duplicate-invariant union estimates and input bounds.

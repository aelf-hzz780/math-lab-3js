# 复环面模空间切片 / A slice of complex-torus moduli

该实验展示 `Eτ = ℂ / (ℤ + τℤ)`，其中 `Im τ > 0`。它是 Tsimerman 关于 `A_g` 的 André–Oort 工作所涉及模空间概念的 `g=1` 教学切片，不是高维定理或证明的实现。研究版本固定为 `arXiv:1506.01466v5`，避免把早期较宽的标题误当成最终范围。

This experiment displays `Eτ = ℂ / (ℤ + τℤ)` with `Im τ > 0`. It is a `g=1` teaching slice of moduli-space concepts related to Tsimerman's André–Oort work for `A_g`, not an implementation of the higher-dimensional theorem or proof. The source is pinned to `arXiv:1506.01466v5` to preserve its stated scope.

基准参数给出 `τ₀`。按钮累积 `M ∈ SL₂(ℤ)` 并显示当前 `τ = M·τ₀`，其中 `M·τ = (aτ+b)/(cτ+d)`。`S = [0 −1;1 0]`、`T = [1 1;0 1]` 分别执行反演和整数平移。左下图中的标记与指标使用当前 τ；修改 τ 的实部、虚部或重置会恢复单位矩阵，晶格截取半径和曲面显示方式保留当前变换。这些操作是同一复环面的不同晶格基底。

The controls specify a base value `τ₀`. Actions accumulate `M ∈ SL₂(ℤ)` and display the current `τ = M·τ₀`, where `M·τ = (aτ+b)/(cτ+d)`. The generators `S = [0 −1;1 0]` and `T = [1 1;0 1]` perform inversion and integer translation. The lower-left marker and metrics use the current τ. Editing its real or imaginary part or resetting restores the identity matrix; lattice extent and surface display settings retain the current transformation. These actions change the lattice basis of the same complex torus.

标准基本域满足 `|Re τ| ≤ 1/2`、`|τ| ≥ 1`。归约通过最近整数平移和反演实现。基本域在有限画布高度截断，面板标注可见虚部上限；网格采用自适应的 1/2/5 倍十进制步长，横纵网格线合计最多 40 条，连续平移不会按 τ 的大小线性增添几何。边界的等价代表可同时存在。晶格基底 `(1/√y,0)` 与 `(x/√y,√y)` 的行列式为 1；为了适配画面，显示时再做一个统一缩放，这不会更改记录的数学面积。

The standard fundamental domain has `|Re τ| ≤ 1/2` and `|τ| ≥ 1`. Reduction alternates nearest-integer translations and inversion. The infinite domain is truncated to the canvas height with its visible imaginary-part limit labeled. Adaptive 1/2/5 decimal grid spacing caps the combined horizontal and vertical grid at 40 lines, so repeated translations do not add geometry in proportion to τ. Equivalent boundary representatives may coexist. The lattice basis `(1/√y,0)`, `(x/√y,√y)` has determinant 1. A further uniform display scaling fits it into the panel without changing the recorded mathematical area.

标出的 CM 点为 `i`、`ρ = −1/2 + i√3/2`、`i√2`，分别满足 `τ²+1=0`、`τ²+τ+1=0`、`τ²+2=0`，判别式为 `−4`、`−3`、`−8`。识别过程先归约到基本域，再以浮点容差比较这三个代表。其他点显示“未标注”，不宣称其没有复乘结构。

The marked CM points are `i`, `ρ = −1/2 + i√3/2`, and `i√2`, satisfying `τ²+1=0`, `τ²+τ+1=0`, and `τ²+2=0`, with discriminants `−4`, `−3`, and `−8`. Recognition first reduces to the fundamental domain, then compares these representatives with floating-point tolerance. Other points are labeled unmarked rather than declared non-CM.

上方三维环面说明相对边粘合后的拓扑和两个周期。它不提供平坦环面的等距嵌入，不能从三维管的半径推断 τ。每帧只移动两个周期示踪点；参数变化时重建有限网格与标签，释放旧资源。

The upper 3D torus illustrates the topology after identifying opposite edges and highlights two cycles. It is not an isometric embedding of the flat torus, so its radii do not determine τ. Each frame moves only two cycle tracers. Parameter changes rebuild the bounded grids and labels and dispose of the old resources.

测试覆盖上半平面保持、`S²=(ST)³=1` 在 τ 上的作用、基本域成员关系、归约矩阵复算、面积归一、晶格平移、CM 固定点和无效输入。场景回归额外检查显示控制保留变换、连续 128 次 T 的几何预算，以及任意视域最多 40 条网格线。运行 `node --test tests/moduli.test.js`。

Tests cover preservation of the upper half-plane, `S²=(ST)³=1` acting on τ, fundamental-domain membership, reconstruction through the reduction matrix, normalized area, lattice translations, CM fixed points, and invalid inputs. Scene regressions additionally check retained transformations under display changes, geometry after 128 T actions, and the forty-line grid budget across view extents. Run `node --test tests/moduli.test.js`.

- [Tsimerman, The André–Oort conjecture for A_g, v5](https://arxiv.org/abs/1506.01466v5)
- [Modular group](https://en.wikipedia.org/wiki/Modular_group)
- [Complex multiplication](https://en.wikipedia.org/wiki/Complex_multiplication)
- [IMU Fields Medals 2026](https://www.mathunion.org/imu-awards/fields-medal/fields-medals-2026)

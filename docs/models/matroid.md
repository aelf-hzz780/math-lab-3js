# 拟阵与 Lorentzian 多项式 / Matroids and Lorentzian polynomials

模型为 K₄ 的图拟阵。边序为 AB、AC、AD、BC、BD、CD，选边状态使用六位掩码。秩为 `4−连通分量数`；独立集恰为森林，基恰为含三条边的生成树。枚举 64 个子集得到 16 个基。选边只改变交互高亮，不改变完整基多项式 `b(w)=Σ_T ∏_{e∈T}w_e`。

The model is the graphic matroid of K4. Edges AB, AC, AD, BC, BD, CD correspond to six mask bits. Rank is `4−components`; forests are independent sets and three-edge spanning trees are bases. Enumerating 64 subsets yields 16 bases. Selection changes highlighting only; the full basis generating polynomial remains `b(w)=Σ_T ∏_{e∈T}w_e`.

右侧曲面使用 `x=wAB`、`y=wAC`、其余四权重均为正数 λ；显示高度为 `0.52 log b(x,y,λ,λ,λ,λ)+0.25`。金点与截线标记当前权重。解析梯度与 Hessian 从全部 16 个三次单项式计算。页面展示二维截面 Hessian 的两个非正特征值；这反映对数凹性，不能把它们误称为图面几何的主曲率。

The surface uses `x=wAB`, `y=wAC`, and a shared positive weight λ for the four remaining edges. Height is `0.52 log b(x,y,λ,λ,λ,λ)+0.25`. The marker and section show the current weights. Analytic gradients and Hessians are evaluated from all 16 cubic monomials. The two nonpositive slice-Hessian eigenvalues demonstrate log-concavity; they are not the surface's geometric principal curvatures.

每个一阶偏导都是二次 Lorentzian 多项式。例如 `∂AB b=(wAC+wBC)(wAD+wBD)+(wAC+wBC)wCD+(wAD+wBD)wCD`。其六变量 Hessian 的谱为 `{1+√5,1−√5,−2,0,0,0}`；另外五条边由 K₄ 对称性给出同样的谱。六根柱展示一个正、两个负、三个零的方向。Brändén–Huh 理论给出拟阵基多项式的 Lorentzian 性质；Huh 的 2022 年 Fields Medal 获奖工作明确包括该理论。

Each first derivative is a quadratic Lorentzian polynomial. For example, `∂AB b=(wAC+wBC)(wAD+wBD)+(wAC+wBC)wCD+(wAD+wBD)wCD`. Its six-variable Hessian spectrum is `{1+√5,1−√5,−2,0,0,0}`; K4 symmetry gives the same spectrum for all other edges. The six bars show one positive, two negative, and three zero directions. Brändén–Huh theory establishes the Lorentzian property of matroid basis polynomials, and the theory appears explicitly in Huh's 2022 Fields Medal citation.

实验是经典小图的有限教学模型，二维切片不替代一般性证明。这里的 Lorentzian 不是相对论时空。seed 不改变此确定图；不需要随机数。权重入口限制正区间 `[0.1,3.5]`，纯计算接口检查有限值和边界。几何只在参数变化时更新，无动画分配或独立计时器。

This is a finite teaching example on a classical small graph; a two-dimensional slice does not replace a general proof. Lorentzian here does not mean relativistic spacetime. The seed does not change this deterministic graph. UI weights lie in `[0.1,3.5]`; pure functions validate finite values and bounds. Geometry updates on parameter changes, with no per-frame allocations or independent timers.

来源 / Sources: [IMU 2022](https://www.mathunion.org/imu-awards/fields-medal/fields-medals-2022), [Lorentzian polynomials](https://arxiv.org/abs/1902.03719), [Huh citation](https://www.mathunion.org/fileadmin/IMU/Prizes/Fields/2022/IMU_Fields22_Huh_citation.pdf). 来源核验 / verified: 2026-09-10.

验证 / Validation: `node --test tests/matroid.test.js`。包括基交换公理、矩阵树定理独立核对、齐次性、解析导数与差分、精确谱对照、暂停调参、点选与资源释放。Tests cover basis exchange, an independent matrix-tree determinant, homogeneity, derivative finite differences, exact-spectrum comparison, paused parameter changes, picking, and disposal.

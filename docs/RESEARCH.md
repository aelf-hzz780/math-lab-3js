# 研究基线：新的构造与经典模型

研究资料核验基线：2026-09-09。精确数据下载与实现审计：2026-09-10。以下采用可定位的原始来源；来源中的声称、数学数据的本地验证与页面中的可视化模型分别说明。

2026-09-10 增加的七项专题见 [ADDITIONS.md](ADDITIONS.md)：2026 菲尔兹奖相关的实数 Kakeya、硬球碰撞、环面结和模空间，以及 Noperthedron、E8、拟阵与 Lorentzian 多项式。各项分别标注研究年份、获奖背景和教学边界。

See [ADDITIONS.md](ADDITIONS.md) for the seven topics added on 2026-09-10: real Kakeya, hard-sphere collisions, torus knots, and moduli associated with Fields 2026, plus Noperthedron, E8, and matroids/Lorentzian polynomials. Research dates, award context, and teaching limits are distinguished.

## 最新流体研究与截图

[OpenAI 2026-09-08 公告](https://openai.com/index/navier-stokes-solution/)声明给出了光滑外力条件下、从静止光滑初态出发的 Navier–Stokes 有限时间奇点构造，以及 Lean 形式化。声明针对官方问题的 C/D 分支。公告描述了径向汇聚、旋转加速、轴向拉伸与收缩区域中保持有限能量的机制。

核验时 [Clay Mathematics Institute 页面](https://www.claymath.org/millennium/navier-stokes-equation/)仍标为 Unsolved。该状态是资料快照，不作为对新证明正误的独立判断；本项目没有运行 Lean 形式化，也没有证明千禧年难题。

截图中的 Danielle Fong 回复明确说明其演示采用 lattice Boltzmann。Roy 的帖子所附画面标有 Grok Imagine 生成。它们可作为视觉线索，不能从画面反推精确方程或把视觉效果视为数学证明。

`#vortex` 实验使用经典 Burgers vortex：

`u_r = −ar/2, u_y = ay, u_θ = Γ(1−exp(−r²/r_c²))/(2πr), r_c = sqrt(4ν/a)`。

参数 a、ν 均为有限正数，轴心采用连续极限。该场光滑、散度为零，适合解释涡量与拉伸。它不是新证明的数值复现。

新增的 `#navier` 使用独立有限几何流管示意，详见 [N–S 模型](NS_MODEL.md)；它与 Burgers 解析速度场分别标注。

## 已实现的新构造

| 构造 | 来源与时间 | 新颖性及 AI 的作用 | 页面对应 |
|---|---|---|---|
| 604 点、11 维接吻构型 | [Station，2026-08-24](https://arxiv.org/abs/2608.23691)；[EinsteinArena，2026-06](https://arxiv.org/abs/2606.10402) | AI 多代理系统搜索并解释构造；Station 报告三个非等距构型，其中两个据作者判断为新类。604 改进此前 AlphaEvolve 的 593 点下界，并非接吻数精确值 | 三套原始整数系数、精确接触关系、11D→3D 投影 |
| 有限域 Kakeya 家族 | 同一 Station 论文 | 对 p≡3 mod4 的新无限家族，比对应 AlphaEvolve 构造节省 (p−3)/4 个点 | p=7/11/19 精确生成，独立枚举验证所有方向 |
| MAX-4-CUT gadget | [2509.18057v7](https://arxiv.org/html/2509.18057v7)，2025 首稿、2026 修订 | AlphaEvolve 搜索更强的有限图构造；结合已有归约框架得到近似困难性结果 | 原始 19 节点加权图，155 边、总权重 52941 |
| Hat 非周期单块 | [作者页](https://cs.uwaterloo.ca/~csk/hat/)，2023 发现、2024 发表 | 数学家构造，解决一种形状强制非周期铺砌的问题；不归为 AI 发现 | 作者的真实替换规则、合法镜像与有限 patch |

逐项的精确公式、数据形状、SHA-256、源码固定版本和数学限制见 `CONSTRUCTIONS.md`。

## 经典物理与图形技术

量子纠缠的联合概率按 Born rule 计算。以两个测量方向为横轴、P(++) 为高度的曲面是概率函数图形。最大纠缠时约化态为 I/2；远端测量方向不能改变本端边缘概率。CHSH 演示使用 α=0°、α′=90°、β=45°、β′=−45° 的固定设置，Bell 态达到 2√2。

沙丘是带不对称沙脊与风纹的程序化地形；不模拟输沙动力学。火花遵循重力和线性阻力，不模拟燃烧。海水为满足深水色散关系的波叠加，加上四点浮力、小角度姿态与近似 Kelvin 尾流；不是流固耦合求解器。上述三类用于复现截图所示的视觉和交互能力，未称为近期新数学结构。

## 选择依据

首版优先公开、可在浏览器表达且可验证的有限构造。研究部分用原始坐标、边表与替换规则；物理部分用有解析性质或稳定验证基线的模型。完整 DNS/LBM、Lean 证明重跑及无法取得构造数据的研究未纳入首版，避免用艺术形状替代具体研究对象。

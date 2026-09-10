# 硬球与碰撞历史 / Hard Spheres and Collision History

本实验关联邓煜的 2026 菲尔兹奖，以及 Deng–Hani–Ma 的 [Long time derivation of the Boltzmann equation from hard sphere dynamics，v3](https://arxiv.org/abs/2408.07818v3)（2024 首稿，2025 修订）和 [2025 年配套论文](https://arxiv.org/abs/2503.01800)。颁奖与论文信息于 2026-09-10 核验。论文使用名为 molecules 的组合图和切割算法；本实验展示普通的碰撞事件历史图，不声称复现这些证明结构。

This experiment accompanies Yu Deng's 2026 Fields Medal and the Deng–Hani–Ma papers [Long time derivation of the Boltzmann equation from hard sphere dynamics, v3](https://arxiv.org/abs/2408.07818v3) (first submitted in 2024, revised in 2025) and its [2025 companion](https://arxiv.org/abs/2503.01800). Award and paper details were checked on 2026-09-10. The paper uses combinatorial diagrams called molecules and a cutting algorithm; this experiment displays an ordinary collision-event history graph rather than reproducing those proof structures.

32、64 或 96 个等质量硬球在半边长 2.7 的反射立方体内运动。初始位置使用无重叠网格和固定 seed 扰动；高斯速度移除平均动量后缩放，使初始能量 E=3NT/2。每次展示先确定性推进 2.4 模型秒，以便首帧就有真实碰撞历史；重置重复相同初始化和预演。温度或半径变化也重新初始化，而不对原状态即时加热或膨胀。

There are 32, 64 or 96 equal-mass spheres in a reflecting cube of half-width 2.7. Initialization uses a nonoverlapping grid with seeded perturbations and Gaussian velocities centered to zero mean momentum and scaled to E=3NT/2. A deterministic 2.4-model-second warmup provides real collision history at the first displayed frame; reset repeats initialization and warmup. Changing temperature or radius also reinitializes, rather than instantaneously heating or expanding the existing state.

模型使用 1/240 秒固定步长，按最大速度必要时细分。每次漂移后通过边长等于球直径的空间网格搜索相邻格，执行两轮局部接触修正；球间碰撞交换法向速度。重叠修正改变位置而不改变动能，碰撞时刻具有有限步长误差。反射墙面速度取反，并累计墙面动量交换，因此 Pgas+Pwall 守恒；气体自身总动量并非守恒量。

The model uses fixed steps of 1/240 second, subdivided when required by maximum speed. After drift, a spatial grid with cells one sphere diameter wide searches neighboring cells and performs two local contact-correction passes. Sphere collisions exchange normal velocity components. Overlap correction changes positions without changing kinetic energy, and collision times retain finite-step error. Wall reflection reverses the normal velocity and accumulates the wall's momentum exchange, conserving Pgas+Pwall rather than gas momentum alone.

每个历史节点记录球间碰撞的时间和两颗粒子，父节点是对应粒子的上一次碰撞；故节点按时间形成有向无环图。只保留最近 96 次，界面可显示 24、64 或 96 次，窗口外父节点不绘制。右侧布局的横轴为时间，其他坐标用于避免重叠，不是物理位置。左侧细线编码当前速度，光环标记最近碰撞或选中粒子。

Each history node records a sphere collision, its time and the two particle IDs. Parents are those particles' preceding collisions, forming a temporal directed acyclic graph. The model retains the latest 96 events; the UI shows 24, 64 or 96, omitting edges to parents outside the window. The graph's horizontal axis represents time, while other coordinates separate nodes and are not physical positions. Fine lines in the particle chamber encode current velocity; halos mark recent collisions or the selected particle.

这不是 Boltzmann–Grad 极限或分子混沌证明，也没有求解 Boltzmann PDE。反转速度保持能量，但位置修正意味着离散模拟不保证精确时间反演。测试覆盖双球法向交换、确定性初始化、墙面边界与动量记账、30/60 FPS 相同演化、长期能量和含墙面动量守恒，以及历史容量和空间网格候选数。

This is neither a Boltzmann–Grad limit nor a propagation-of-chaos proof and does not solve the Boltzmann PDE. Velocity reversal preserves energy, but positional corrections mean the discrete simulation is not guaranteed to be exactly time-reversible. Tests cover two-sphere normal exchange, deterministic initialization, wall bounds and momentum accounting, identical 30/60-FPS evolution, long-run energy and gas-plus-wall momentum conservation, history capacity and spatial-grid candidate counts.

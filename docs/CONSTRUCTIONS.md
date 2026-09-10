# 新数学构造：来源、边界与复现

核查时间：2026-09-10。实现中的数据已固定在本地；页面运行不依赖在线 API。数学真实性、三维展示方式与发表状态分别说明。

## 11 维 604 点接吻构型

原论文：Stephen Chung、Wenyu Du、William J. Wesley，*Autonomous Mathematical Discovery in an Open-World Multi-Agent Environment*，2026-08-24，<https://arxiv.org/abs/2608.23691>。

证书：<https://github.com/dualverse-ai/station_data_v2/tree/main/artifacts/kissing_number>。三套 `config_coefficients` 的形状为 `(3,604,11,2)`，每个坐标为 `(P + Q√2)/6`。原始 `kissing_certificates.npz` 的 SHA-256 是 `61b3a572ad194a3b97d8bcae8694d57ae676328a81ef0e4db95e57a2c9d44f37`。`python3 data/convert-kissing.py` 可用 Python 标准库重建浏览器 JSON。

全部 604 点的范数平方为 4。不同点的内积不超过 2，等号即接触。三套接触数分别为 19,704、22,904、22,840，对跖点对分别为 302、302、238。测试采用整数系数与 BigInt 符号比较，独立检查所有点对；不使用浮点容差充当数学证明。核心 496 点与扩展 108 点分别着色。

604 是接吻数下界，不是接吻数精确值。EinsteinArena 于 2026-06-09 报告 604 点（<https://arxiv.org/abs/2606.10402>）；Station 独立重获该类，并给出两个据作者判断为新的非等距类。三维中只显示正交投影；接触边从原始 11D 精确坐标计算，与投影重叠无关。

证书仓库为 Apache 2.0，原始许可、NOTICE 随附于 `data/STATION-LICENSE` 与 `data/STATION-NOTICE`。JSON 是无损整数格式转换，未修改构型。

## 有限域 Kakeya 新无限家族

来自同一 Station 论文及原始公式：<https://github.com/dualverse-ai/station_data_v2/blob/main/artifacts/finite_kakeya/verification.ipynb>。

令 Q 为 F_p 上包含 0 的平方剩余集，取

`B = {(x,y,z): x²+4y ∈ Q, x²+4z ∈ Q}`。

在 x=0 平面加入 `(0,t,ct+c/(c-1))`（c≠1），以及 `(0,t,t)` 与 `(0,0,t)`；全部运算为模 p。并集在 p≡3 mod4 时有 `(2p³+7p²+3)/8` 点，比 AlphaEvolve 适用无限家族节省 `(p-3)/4` 点；p≡1 mod4 的分支是仿射等价的独立重获。

UI 选择 p=7、11、19，分别为 129、439、2031 点。所有 p²+p+1 个 projective 方向都有显式直线见证。测试枚举方向与其全部 p 个点，并检查精确点集包含关系。格点展示不连接模环绕产生的欧式长跳跃。论文另有独立优化得到的 F_3³ 中 13 点集，不能与本无限家族 p=3 的 15 点混用。

## 19 节点 MAX-4-CUT gadget

Ansh Nagda、Prabhakar Raghavan、Abhradeep Thakurta，*Reinforced Generation of Combinatorial Structures: Hardness of Approximation*。2025-09-22 首稿，2026-03-09 v7：<https://arxiv.org/html/2509.18057v7>。

数据逐项取自附录 C.1 “Gadgets for MAX-4-CUT” 的 I⁰ gadget 加权边表。19 个节点、155 个唯一无向边对、总权重 52941。每项 `(a,b,w)` 表示 w 条平行边，页面合并为一条带权重的边。最大边权 1429 位于 (5,7)，最小边权 1 位于 (7,13)。原变量为 1—3，全局变量为 4—7，辅助变量为 8—19。

`maxcut.json` 的 edges 数组以无空格 JSON 序列化后的 SHA-256 是 `831a810297e5bea20a22434785e15dd80dbaf33e69fc6f667c3bce4e70b685ff`。测试核对哈希、边表合法性、总和、颜色置换不变性和局部改进单调性。

只计算整数目标 `Σw[c(u)≠c(v)]`；过滤边只影响显示。三维布局是人为可视化布局。演示的局部搜索不承诺全局最优，也不替代论文完整归约证明。这里按引用转录数学数据，未复制论文图片或上游程序。

## Hat 非周期铺砌

David Smith、Joseph Samuel Myers、Craig S. Kaplan、Chaim Goodman-Strauss，2023 年发现，2024 年 6 月发表于 *Combinatorial Theory*：<https://cs.uwaterloo.ca/~csk/hat/>。

作者原始生成器 <https://github.com/isohedral/hatviz> 固定至 commit `4bb9d01999e4e84accc2a78d0fa279ef20b47263`。`vendor/hat/` 保存原始 geometry.js、hat.js 与完整 BSD 3-Clause 许可证。Copyright (c) 2023, Craig S. Kaplan。

`generator.js` 仅移除 P5 绘制和 UI 层，换用 Math 三角函数，补上隐式全局变量声明；保留 13 顶点 Hat 轮廓、H/T/P/F 初始 metatile、固定替换与边匹配规则。三个替换层的 H patch 有 25、169、1156 个同面积 tile；初始 H 有 4 块。测试比较这些计数、有限坐标、13 顶点、同面积与镜像存在性。

镜像 Hat 为原构造的必要组成，保留并标金色。展示厚度和生长次序为演示效果，平面轮廓与拼块位置保持作者规则。有限 patch 本身不是非周期性证明，证明见原论文。此实验不使用 Spectre。

## 验证与资源

从项目目录运行 `node --test tests/kissing.test.js tests/kakeya.test.js tests/maxcut.test.js tests/hat.test.js`。本组实现遵循先写失败测试再实现的流程。

604 点全配对验证按构型缓存，每个构型在本次实例中首次选择时验证；逐帧仅投影与更新所选接触边。Kakeya 构造在素数变化时重建，运行时从显式见证选取方向。MAXCUT 每次着色的评分线性扫描 155 条边。Hat 最高深度限制为 3，几何合并到一个 Mesh。实验 dispose 释放 geometry、material、texture 与场景 group；没有独立定时器或全局监听器。

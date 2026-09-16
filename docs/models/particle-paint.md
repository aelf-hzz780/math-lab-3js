# 流彩粒子画 / Living Pigment

核验记录：2026-09-16。视觉依据为用户提供的 Carolina Aiazzi（@Cora_Mat）帖子截图，画面是带边框、有景深的紫红色纤维粒子作品。未取得或核验原帖 URL、动态视频、源码、图片资源、实际粒子数量与性能测试；截图中的“200 万”是作者表述，不能作为本实验的实测结果。仓库不包含该截图。

Verification record: 2026-09-16. The supplied screenshot of a Carolina Aiazzi (@Cora_Mat) post shows a framed, dimensional artwork made of purple and red particle fibers. The original post URL, moving video, source code, source images, actual particle count, and performance measurements have not been verified. The screenshot's “two million” statement is the author's claim, not a benchmark for this implementation. The reference screenshot is not redistributed.

## 目标与交互 / Intent and interaction

三种原创程序构图“绛紫花潮”“蓝调绸带”“珊瑚漩涡”使用同一批稳定标识的粒子。自动换画与连续构图滑块改变它们的位置和颜色；鼠标或手指施加局部推力，按下产生吸引。相机旋转显示画框、底板与纤维之间的实际三维视差。暂停会冻结动画与已渲染的力场；暂停期间的指针输入在继续播放后生效。

Three original procedural compositions share particles with stable identities: Crimson Bloom, Blue Ribbon, and Coral Vortex. Automatic morphing and the continuous composition slider change their positions and colors. A pointer applies local repulsion, while pressing attracts the fibers. Camera rotation reveals real 3D parallax between the frame, backing, and strokes. Pausing freezes animation and the rendered interaction field; pointer input received while paused takes effect after playback resumes.

## 数学构造 / Mathematical construction

每个粒子具有由固定 seed 生成的四个均匀样本 `s=(u,v,w,k)∈[0,1)⁴`。改变粒子数量时保留同一 seed 序列的公共前缀。花潮构图将 `k` 分成五簇，使用球坐标 `θ=2πu+0.8·floor(5k)`、`φ=acos(2v−1)`，将球体低频扇贝形变并组合成两团主花潮和中间的过渡区域。半径为：

Each particle owns four uniform samples `s=(u,v,w,k)∈[0,1)⁴` generated from a fixed seed. Changing particle count preserves the shared prefix of the same seed sequence. The bloom uses five clusters selected by `k`, with spherical angles `θ=2πu+0.8·floor(5k)` and `φ=acos(2v−1)`. Low-frequency scalloping deforms rounded volumes into two principal blooms and a connecting region. Its radius is:

```text
r = (0.43 + 0.64 · w^(1/3))
    · [1 + 0.16 sin(3θ+φ) sinφ + 0.10 cos(5θ−2φ) sin²φ]
```

绸带构图围绕三周螺旋路径采样一个带厚度的管体；漩涡构图采样带轴向起伏的椭圆环状体。所有形状都是美术设计的参数体积；它们不代表新发现的数学对象，也不是对参考图片的深度估计。

The ribbon samples a thick tube around a three-turn helical path. The vortex samples an elliptical annular body with axial undulations. These shapes are artist-designed parametric volumes. They are neither newly discovered mathematical objects nor depth estimates reconstructed from the reference image.

循环相位 `q mod 3` 决定相邻两幅构图的权重，插值核为 `h(t)=6t⁵−15t⁴+10t³`。权重非负且和为 1；每个整数相位处的一阶、二阶导数连续，包括第三幅到第一幅的闭合过渡。颜色使用相同权重进行插值。花潮的珊瑚色集中在两个低频空间区域，外围为蓝紫色，正面有淡薰衣草色高光，避免视角驱动的周期彩虹条带。

The cyclic phase `q mod 3` selects the weights of two adjacent compositions using `h(t)=6t⁵−15t⁴+10t³`. Weights are nonnegative and sum to one. First and second derivatives are continuous at integer phases, including the closed transition from the third composition to the first. Colors use the same blend weights. Two broad spatial regions create coral centers in the bloom, with blue-violet edges and pale lavender foreground highlights, avoiding view-dependent cyclic rainbow bands.

运动方向来自以下解析向量势的旋度：

Motion directions come from the curl of this analytic vector potential:

```text
A(x,y,z,t) = (
  sin(y+0.7t) sin(z),
  sin(z−0.5t) sin(x),
  sin(x+0.4t) sin(y)
)
v = ∇ × A
∇ · v = 0
```

着色器沿该场直接施加有界位移，并将短细笔触与局部流向对齐。这不是速度场的数值积分；`∇·v=0` 不意味着位移映射保持体积。局部鼠标力采用随距离平方指数衰减的近似力场，不满足流体守恒方程。

The shader applies bounded displacements along this field and aligns short fine strokes to its local direction. This is not numerical integration of a velocity field; `∇·v=0` does not imply that the displacement map preserves volume. Pointer interaction uses an approximate force with exponential falloff in squared distance, without fluid conservation equations.

## 实现、边界与验证 / Implementation, limits, and validation

使用一个 `InstancedBufferGeometry` 和一个自定义 `ShaderMaterial`，每个粒子只有四个 `Float32` seed 属性。每帧仅上传少量 uniform；没有逐帧 CPU 粒子数组更新，也没有每帧两两粒子作用。每个粒子绘制两个三角形，并用软透明掩码形成纤维。默认桌面 240,000 粒子，低画质最多 120,000，并将笔触增粗 1.65 倍以避免窄屏亚像素消失；滑块可选择最多 2,000,000，但该档每帧需要绘制 4,000,000 个三角形，其流畅度取决于设备。此处不作 200 万粒子实时性能承诺。

One `InstancedBufferGeometry` and one custom `ShaderMaterial` draw the artwork. A particle stores only four `Float32` seed attributes. Each frame updates a small set of uniforms, with no CPU particle-array updates or pairwise particle interactions. Each stroke uses two triangles and a soft transparent mask. The desktop default is 240,000 particles; low quality caps the count at 120,000 and scales strokes by 1.65 to reduce subpixel disappearance on narrow screens. A slider exposes up to 2,000,000 particles, requiring 4,000,000 triangles per frame at that setting. Performance is device-dependent; no two-million-particle realtime claim is made here.

透明度混合是显示近似，没有逐粒子透明排序、真实毛发散射、物理光谱或体积光线追踪。所有程序内容在本地生成；运行时无网络访问、模型调用或图片依赖。重建时旧几何立即释放；切换、AbortSignal 与重复 dispose 共用显式资源清理。

Transparency blending is a display approximation. It does not implement per-particle transparency sorting, physical hair scattering, spectral rendering, or volumetric ray tracing. All procedural content is generated locally, without runtime network access, model calls, or image dependencies. Rebuilds release previous geometry; switching, AbortSignal cancellation, and repeated disposal share explicit resource cleanup.

数学测试检查 seed 可重复性与公共前缀、三构图闭环插值连续性、curl 场有限差分散度、三种构图的有限体积范围及粒子预算与无效参数。浏览器视觉、交互、暂停、重置、导出与资源测试见项目验收报告。

Math tests check seed reproducibility and prefix stability, continuity of the closed three-composition blend, finite-difference divergence of the curl field, finite target extents, particle budgets, and invalid inputs. Browser appearance, interaction, pause, reset, export, and resource checks are recorded in the project QA report.

## 来源 / Sources

- 视觉作者主页（只由截图辨认）/ Visual author's profile (identified only from the screenshot): <https://x.com/Cora_Mat>
- Bridson, Hourihan, Nordenstam, *Curl-Noise for Procedural Fluid Flow*, 2007: <https://www.cs.ubc.ca/~rbridson/docs/bridson-siggraph2007-curlnoise.pdf>
- Three.js `InstancedBufferGeometry`: <https://threejs.org/docs/#api/en/core/InstancedBufferGeometry>

本文引用 curl-noise 工作解释向量势与无散度程序运动的背景；本实验使用上文明确给出的三角函数场，不声称复制论文完整实现或截图作者的算法。

The curl-noise paper supplies background on vector potentials and divergence-free procedural motion. This experiment uses the explicit trigonometric field above and does not claim to copy the paper's full implementation or the reference author's algorithm.

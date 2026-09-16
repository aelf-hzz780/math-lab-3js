# 液态玻璃 / Liquid Glass

这是根据用户于 2026-09-16 提供的 Shader Development Studio（@shadersweden）截图创作的原创实时图形实验。截图呈现透明流体环、银白高光、云层折射和轻微棱边色散。我们未取得原视频、源码或可执行演示，因此不声称复现作者的 TSL / WebGPU 流体模拟。

This original realtime graphics experiment interprets a user-supplied screenshot of Shader Development Studio (@shadersweden), received on September 16, 2026. The reference shows transparent liquid loops, broad silver highlights, refracted clouds and subtle dispersion. The original video, source code and runnable demo were not available, so this is not a reproduction of the author's TSL / WebGPU fluid simulation.

## 形体与交互 / Shape and interaction

场景以两个在局部坐标中旋转的变形环体为主体，并平滑连接球状液滴。环体的大半径与截面半径沿极角作低频正弦变化，使表面保持连续。局部牵引先扭曲查询点 `q = p − u exp(−0.28 |p−a|²)`，其中 `a` 是拖动起点，`u` 是牵引位移。该场是 distance-like field；坐标扭曲与缩放后并非严格的 SDF。射线步进采用保守步长与有限迭代。

Two rotated, warped toroidal fields form the main body, smoothly joined to spherical droplets. Low-frequency angular sine functions vary the major and tube radii continuously. Local pulling warps each query point as `q = p − u exp(−0.28 |p−a|²)`, where `a` is the initial drag point and `u` is the displacement. This is a distance-like field, not an exact SDF after warping and scaling. Ray marching uses conservative steps and bounded iterations.

平滑 union 使用 `smin(a,b,k) = min(a,b) − k max(1−|a−b|/k,0)² / 4`。有限个水滴采用独立表面；它们不会触发质量守恒、真实断裂或流体融合计算。三个预设控制主环厚度、水滴尺寸与流动节奏。

The smooth union is `smin(a,b,k) = min(a,b) − k max(1−|a−b|/k,0)² / 4`. A finite set of droplets remains independent geometry; it does not solve mass conservation, physical break-up or fluid merging. Three presets vary loop thickness, droplet size and motion rhythm.

牵引位移遵循临界阻尼弹簧 `ẍ + 2ωẋ + ω²(x−target) = 0`。目标在一步内固定时，解析解为 `e = exp(−ωdt)`、`c = v + ω(x−target)`、`x′ = target + (x−target+c dt)e`、`v′ = (v−ωc dt)e`。界面的“黏滞感”决定 `ω = 7 / viscosity`，是一种交互手感参数，不是流体运动黏度。固定目标下任意时间细分得到同一状态。

Pull displacement follows the critically damped spring `ẍ + 2ωẋ + ω²(x−target) = 0`. For a target held constant during one step, the exact update is `e = exp(−ωdt)`, `c = v + ω(x−target)`, `x′ = target + (x−target+c dt)e`, and `v′ = (v−ωc dt)e`. The “viscosity feel” control sets `ω = 7 / viscosity`; it is an interaction parameter, not fluid kinematic viscosity. Subdividing time under a fixed target produces the same state.

## 光学与相机 / Optics and camera

Shader 使用 Three.js 相机的逆投影矩阵与世界矩阵逐像素产生真实世界射线，因此环视、缩放、宽高比变化和暂停时的相机操作均作用于同一三维形体。射线寻找第一入射界面，按 Snell 定律进入介质，再步进至下一出射界面。Fresnel-Schlick 权重混合反射与折射；RGB 三个有限折射率近似棱边色散，指数衰减近似有色吸收。

The shader reconstructs world-space rays from the actual Three.js camera inverse projection and world matrices. Orbit, zoom, aspect ratio changes and camera motion while paused therefore act on the same three-dimensional object. Rays find an entry interface, refract using Snell's law, and march to the next exit interface. Fresnel-Schlick weighting mixes reflection and transmission. Three nearby RGB indices approximate dispersion, and exponential attenuation approximates tinted absorption.

云层环境由固定 seed 的多尺度三维噪声在球面上采样成本地纹理。白色矩形面光源以方向函数加入环境反射，营造柔和但清晰的高光。云层不是体积云；折射不包含多次内反射、真实焦散、偏振或完整光谱积分。出射方向发生全内反射时使用单次反射环境近似。有限步数可能遗漏极细结构或掠射表面。

The cloud environment is an original local texture produced by sampling seeded multiscale 3D noise on a sphere. Directional rectangular softboxes add broad, legible highlights. Clouds are not volumetric. Refraction omits repeated internal reflections, physical caustics, polarization and full spectral integration. Total internal reflection at the exit uses a single reflected environment approximation. Bounded ray steps may miss extremely thin or grazing features.

## 性能、可复现性与验证 / Performance, reproducibility and validation

场景每帧仅提交一个全屏三角形对，不创建粒子、临时几何或新的纹理。高档入射最多 86 步、内部最多 38 步；低档分别 60 与 24 步。环境纹理高档 4096×2048，低档 2048×1024（RGBA8 分别约 32 / 8 MiB），仅初始化或更换 seed 时生成。较高分辨率避免球面纹理放大到窄视角后出现粗像素。所有 GPU 资源与 AbortSignal 监听器由 `dispose()` 显式释放。重置恢复同一 seed、相位、形态和零牵引状态。

Each frame draws one fullscreen quad without allocating particles, geometry or textures. High quality limits entry marching to 86 steps and internal marching to 38; low quality uses 60 and 24. Environment textures are 4096×2048 at high quality and 2048×1024 at low quality (approximately 32 / 8 MiB in RGBA8), generated only at initialization or seed changes. This resolution avoids coarse pixels when a narrow field of view magnifies the spherical map. `dispose()` explicitly releases GPU resources and the AbortSignal listener. Reset restores the same seed, phase, shape and zero-pull state.

数学测试验证解析弹簧的时间细分一致性、回弹稳定性、平滑连接的一阶连续性、三个形态的有限与有界场、Snell 正弦定律与全内反射边界，以及非法输入拒绝。浏览器验收另行记录实际 GPU、画质、交互与资源结果，不能用数学测试替代视觉或性能验收。

Math tests verify exact spring timestep subdivision, stable release, first-order continuity of smooth unions, finite bounded fields for all three shapes, Snell's sine law and total internal reflection, and invalid-input rejection. Browser acceptance separately records the actual GPU, quality, interaction and resource results; math tests do not replace visual or performance validation.

## 来源 / Sources

- 截图作者主页 / Screenshot author profile: https://x.com/shadersweden (the precise post URL was not supplied).
- Inigo Quilez, distance functions and smooth union: https://iquilezles.org/articles/distfunctions/
- Physically Based Rendering, dielectric reflection and refraction: https://pbr-book.org/4ed/Reflection_Models/Dielectric_BSDF

来源链接用于署名与公式背景，并不表示已核验参考作者的实现。程序化纹理与场景代码均为本项目原创，运行时无远程图片、视频或 API 请求。

Source links provide attribution and mathematical background; they do not establish the reference author's implementation. The procedural texture and scene code are original to this project, with no runtime remote image, video or API requests.

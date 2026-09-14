# 虹彩异境 / Iridescent Strata

本实验的视觉参考是 Cristian Peñas（[@ilumine_ai](https://x.com/ilumine_ai)）于 **2026-09-11** 发布的 [X 视频](https://x.com/ilumine_ai/status/2098342499865821654)，参考核验日期为 **2026-09-14**。可见特征包括黑色背景、多层悬浮岩片、孔洞与分离碎片、蓝紫粉金的虹彩高光，以及低空穿行的视差。参考帖描述 “infinite terrain variations”；关联帖使用 “procedural latent space” 一词。未获取或核验作者源代码及生成算法，因此这些表述不能作为本实现使用神经网络的证据。

The visual reference is Cristian Peñas ([@ilumine_ai](https://x.com/ilumine_ai))'s [X video](https://x.com/ilumine_ai/status/2098342499865821654), published on **2026-09-11** and reviewed on **2026-09-14**. Visible features include a black background, layered floating rock shelves, holes and detached fragments, blue/violet/pink/gold iridescent highlights, and low-flight parallax. The reference mentions “infinite terrain variations,” and a related post uses “procedural latent space.” The author's source code and algorithm have not been obtained or verified; those phrases do not establish neural-network use in this implementation.

这是独立编写的程序化图形教学模型，不是作者算法的精确复现，不主张新的数学发现，也不归类为 AI 发现的数学结构。运行时无需模型 API、外部纹理、视频或网络服务；参考链接仅用于来源说明。

This is an independently written procedural graphics teaching model, not an exact reconstruction of the author's algorithm, a claim of new mathematics, or an AI-discovered mathematical structure. Runtime use needs no model API, external textures, video or network service; reference links provide attribution only.

## 密度场与几何 / Density and Geometry

与沙丘的单值高度函数 `y = h(x,z)` 不同，这里使用三维标量密度场 `Dθ(x,y,z)`，正值为实体，以 `Dθ = 0` 的等值面表示岩层边界。分层结构、平滑噪声与孔洞控制共同决定该场；θ 包含 seed 和结构参数。同一 `(x,y,z,θ)` 产生相同密度，因而相邻分块能够沿共同的世界坐标采样。三维等值面可以同时表示岩片上下表面、悬空层和穿孔。

Unlike the dunes' single-valued height function `y = h(x,z)`, this scene uses a 3D scalar density field `Dθ(x,y,z)`, where positive values are solid and the isosurface `Dθ = 0` represents rock boundaries. Layering, smooth noise and hole controls define the field; θ includes the seed and structural parameters. Identical `(x,y,z,θ)` inputs produce identical densities, allowing adjacent chunks to sample shared world coordinates. A 3D isosurface can represent upper and lower rock surfaces, floating layers and holes together.

实体的层带为 `S = [cos(2π(y+W)/s) + 0.12 + 0.72L]s/(2π)`，层间距 `s = 5.2/layers`；低频 value noise 扭曲横向坐标并控制位移 W 和鼓起程度 L，使层体具有圆润的起伏。W 还包含 `0.75N(0.28q_x,0.24y,0.28q_z)`，L 包含 `0.4N(0.26q_x,0.22y,0.26q_z)`，在大层体上增加中等尺度的鼓包。孔洞场为 `P = 4[N(q_x/(7·holes), 0.12y, q_z/(7·holes)) − 0.03]`，其中 q 是扭曲后的坐标。有限层带范围 B、高度包络 `E = H/2 − 0.8 − |y|` 与空中通道 C 进一步限定实体。C 挖出半径 1.05、中心在 `y≈2.2` 附近缓慢起伏的通道，服务于观赏视角。各噪声场使用固定 seed 与独立盐值。

The solid's layer field is `S = [cos(2π(y+W)/s) + 0.12 + 0.72L]s/(2π)`, with spacing `s = 5.2/layers`. Low-frequency value noise warps horizontal coordinates and controls displacement W and lobing L, producing rounded volumes. W also includes `0.75N(0.28q_x,0.24y,0.28q_z)`, while L includes `0.4N(0.26q_x,0.22y,0.26q_z)`, adding medium-scale lobes to the larger forms. Perforations use `P = 4[N(q_x/(7·holes), 0.12y, q_z/(7·holes)) − 0.03]`, where q denotes warped coordinates. A finite band limit B, height envelope `E = H/2 − 0.8 − |y|`, and air corridor C further constrain the solid. C cuts a radius-1.05 corridor whose center undulates near `y≈2.2` for the viewing path. Noise fields use a fixed seed and separate salts.

组合采用平滑交集 `m(a,b,k) = min(a,b) − max(k−|a−b|,0)²/(4k)`，实际为 `D = m(m(m(m(S,P,0.9),B,0.7),E,0.7),C,0.65)`。在两项接近的区域，平滑最小值圆润地连接层体、开口与边界，减少硬 `min` 接缝处的法线折痕；它也会轻微收缩正密度实体，因此属于实际形状定义的一部分。这个组合不是 signed distance function，不能把密度值直接用作 sphere tracing 的安全步长。

The smooth intersection is `m(a,b,k) = min(a,b) − max(k−|a−b|,0)²/(4k)`, composed as `D = m(m(m(m(S,P,0.9),B,0.7),E,0.7),C,0.65)`. Where fields approach each other, the smooth minimum rounds the meeting of layers, openings and boundaries, reducing normal creases at hard `min` junctions. It also slightly contracts the positive-density solid, so it is part of the shape definition. This field is not a signed distance function; density values are not safe sphere-tracing step lengths.

每个采样立方体沿同一体对角线拆成六个四面体，再对符号相异的边进行线性插值。例如边端点的密度为 `d₀,d₁`，零点的插值系数为 `t = d₀ / (d₀ − d₁)`，位置为 `(1−t)p₀ + tp₁`。这就是本实现的 **Marching tetrahedra**，不是 Marching Cubes。外向法线为 `−∇D / |∇D|` 的数值近似，使用世界坐标与步幅 0.018 的中心差分。实际场函数、参数验证与网格提取以 [数学源码](../../src/math/iridescent-terrain.js) 为准。

Each sampled cube is divided into six tetrahedra along the same body diagonal, then edges with opposite density signs are interpolated linearly. For endpoint densities `d₀,d₁`, the zero-crossing coefficient is `t = d₀ / (d₀ − d₁)`, giving position `(1−t)p₀ + tp₁`. This implementation uses **Marching tetrahedra**, not Marching Cubes. Outward normals approximate `−∇D / |∇D|` using central differences with step 0.018 in world coordinates. The [math source](../../src/math/iridescent-terrain.js) defines the actual field, parameter validation and extraction.

三角形绕序与光照法线分别处理。此前按平滑顶点法线决定是否翻转三角形，在粗网格中，非线性场梯度可能偏离四面体线性等值面的朝向，导致相邻面绕序不一致；背面剔除因此产生三角缺口。现在依据四面体中“实体顶点→空气顶点”的方向确定绕序，同时保留场梯度作为光照法线。边一致性检查应验证内部共享边被两面以相反方向各遍历一次，不能只检查每条边恰好有两个邻面。

Triangle winding and shading normals are handled separately. Previously, smooth vertex normals determined whether a triangle flipped. On coarse grids, the nonlinear field gradient can disagree with the tetrahedron's linear isosurface, producing inconsistent winding between neighboring faces and triangular gaps from back-face culling. Winding now follows the tetrahedron's direction from a solid corner to an air corner, while field gradients remain shading normals. Edge checks should verify that each interior shared edge is traversed once in each direction, rather than checking only that it has two incident faces.

等值面是采样近似。小于网格尺度的孔洞或薄片可能消失，改变画质也可能改变这些小尺度细节。网格不是地质模拟，不保证所有碎片构成单一连通体，也不用于严格体积、拓扑或曲率证明。

The isosurface is a sampled approximation. Holes or sheets smaller than the grid scale may disappear, and quality changes may alter such fine details. The mesh is not a geological simulation, does not promise a single connected solid, and is not suitable for rigorous claims about volume, topology or curvature.

## 材质、飞行与离线生成 / Material, Flight and Offline Generation

材质使用 Three.js r180 的 [MeshPhysicalMaterial](https://threejs.org/docs/#api/en/materials/MeshPhysicalMaterial)，以粗糙表面、低金属度与宽环境光表现云屿般的柔和轮廓。两个低频空间噪声在雾蓝、淡紫和浅桃色之间连续混合；主配色不随观察角度循环，也不叠加高频颗粒法线。黑色背景与环境照明分别设置，远处使用渐淡的场景雾。材质源码见 [strata-material.js](../../src/rendering/strata-material.js)。

Materials use Three.js r180's [MeshPhysicalMaterial](https://threejs.org/docs/#api/en/materials/MeshPhysicalMaterial), with a rough surface, low metalness and broad environment light for softly rounded floating forms. Two low-frequency spatial noise fields blend continuously among mist blue, lavender and pale peach. The main palette does not cycle with the view angle or add high-frequency grain normals. Background and illumination are separate, with scene fog fading the distance. See [strata-material.js](../../src/rendering/strata-material.js) for the material.

`iridescence` 保留为参数键以维持接口兼容，现在主要控制“色彩晕染”：0 对应中性浅灰，1 使用完整柔和配色，默认 0.8。真实薄膜材质项仅为该值的 0.08 倍，默认 0.064；metalness 为 0.06、clearcoat 为 0.025，默认 roughness 为 0.68。它们是艺术化表面参数，不是光谱测量。所谓云团般效果是实体表面近似，场景雾也只是距离衰减；没有求解真实云雾的体积散射、多重散射、密度输运或大气流体。

The parameter key `iridescence` remains for interface compatibility and primarily controls the pastel blend: 0 gives neutral pale gray, 1 applies the full palette, and the default is 0.8. The physical thin-film term is only 0.08 times this value, or 0.064 by default. Metalness is 0.06, clearcoat 0.025, and default roughness 0.68. These are artistic surface settings, not spectral measurements. The cloudlike appearance is a solid-surface approximation, and scene fog only attenuates with distance; it does not solve volumetric or multiple scattering, density transport or atmospheric flow.

层体之间的明暗由顶点 AO 补充：数学层的 `ambientOcclusion` 在表面外移 0.08 后，沿外法线和世界向上方向，分别在距离 0.65、1.5、3、5 处采样密度，共八次。距离权重为 `[0.34,0.28,0.22,0.16]`；密度经平滑占据函数转换得到覆盖估计 Cₙ 与 Cᵤ，最终系数为 `A = clamp(1 − 0.75(0.42Cₙ + 0.58Cᵤ), 0.25, 1)`。采样使用原始世界坐标，因此块边界的相同点得到相同覆盖值，而不依赖相邻块是否已经渲染。

Vertex AO adds separation between stacked forms. After offsetting a surface point outward by 0.08, the math layer's `ambientOcclusion` samples density at distances 0.65, 1.5, 3 and 5 along both the outward normal and world-up direction, for eight probes. Distance weights are `[0.34,0.28,0.22,0.16]`. A smooth occupancy function maps density to coverage estimates Cₙ and Cᵤ, giving `A = clamp(1 − 0.75(0.42Cₙ + 0.58Cᵤ), 0.25, 1)`. Original world coordinates give matching boundary points the same coverage value regardless of whether neighboring chunks are currently rendered.

AO 只在生成网格顶点时计算，以 `Float32Array occlusion` 与位置、法线、索引一起由 Worker 转移；场景将它作为 `strataOcclusion` 顶点属性，片元阶段插值。材质用该值衰减间接漫反射和间接镜面反射，并用平方值衰减直接漫反射，使层底和凹部更易辨识。这是艺术化的局部遮蔽近似，不是光源可见性的光线追踪、精确阴影或体积散射；两条固定探测方向也不构成半球积分。

AO is computed only while generating mesh vertices. Its `Float32Array occlusion` transfers from the Worker with positions, normals and indices, becomes the `strataOcclusion` vertex attribute, and interpolates across fragments. The material attenuates indirect diffuse and specular light with this value and direct diffuse light with its square, making undersides and recesses easier to distinguish. This is an artistic local-coverage approximation, not ray-traced light visibility, exact shadows or volume scattering; two fixed probe directions do not integrate a hemisphere.

持续穿行通过移动世界与有界分块加载呈现：窗口为 3 列、5 行共 15 块，每块横向尺寸 24×24、高度范围 20；高画质每轴采样 48 个单元，低画质 32 个。前方生成、后方回收，所谓持续探索不等于一次创建或保存无限几何。块顶点采用局部 x/z 坐标，密度与法线仍按原始世界坐标采样，以减少长距离移动时的顶点精度损失。世界平移保留全局 Orbit 相机的旋转和缩放；模型未提供地形碰撞与自动避障，手动视角可能穿入几何或看到窗口边界。

Continuous travel uses world translation and a bounded 3-column, 5-row window of 15 chunks. Each chunk spans 24×24 horizontally and 20 vertically, sampled with 48 cells per axis in high quality or 32 in low quality. Chunks generate ahead and recycle behind; continuing exploration does not create or store infinite geometry at once. Vertex x/z positions are chunk-local while density and normals retain original world coordinates, reducing vertex precision loss during travel. World translation preserves rotation and zoom through the shared orbit camera. There is no terrain collision or automatic obstacle avoidance, so manual views may enter geometry or reveal window boundaries.

分块生成优先运行在由离线 bundle 内嵌代码创建的 Blob Worker 中；Worker 不可用或创建失败时，回退到按块调度的主线程生成，块内计算仍为同步操作。Worker 运行错误由统一错误入口报告。结构参数改变会失效旧任务，场景销毁需要终止 Worker、撤销 Blob URL，并释放网格和环境资源。主循环更新飞行位置与材质状态，不在每帧完整重建地形。

Chunk generation preferably runs in a Blob Worker created from code embedded in the offline bundle. If workers are unavailable or construction fails, a scheduled main-thread fallback yields between chunks, while computation within each chunk remains synchronous. Worker runtime errors go through the shared error path. Structural changes invalidate stale jobs. Disposal must terminate the worker, revoke its Blob URL, and release meshes and environment resources. The frame loop updates flight and material state rather than rebuilding the entire terrain every frame.

## 参数与复现 / Parameters and Reproduction

“晨雾云屿”“层叠梦境”和“月白浮岛”三个预设使用同一组参数和同一生成规则。全局 seed、结构参数与世界位置决定地形；相机、色彩晕染与粗糙度决定画面表现。改变材质或速度不会改写几何定义。

The three presets, “晨雾云屿” (Morning Mist Isles), “层叠梦境” (Layered Reverie) and “月白浮岛” (Moonlit Islands), use the same parameters and generation rules. The global seed, structural parameters and world position determine terrain; the camera, pastel blend and roughness determine appearance. Material or speed changes do not redefine the geometry.

| 参数 / Parameter | 范围 / Range | 含义 / Meaning |
| --- | --- | --- |
| `layers` | 0.65–1.55 | 地层密度，越大则层间距越小 / Layer density; higher values reduce spacing |
| `holes` | 0.65–1.8 | 孔洞噪声的空间尺度 / Spatial scale of perforation noise |
| `iridescence` | 0–1；默认 / default 0.8 | 色彩晕染；薄膜材质项为该值×0.08 / Pastel blend; physical thin-film term is value × 0.08 |
| `speed` | 0–6 | 世界穿行速度；0 静止 / World travel speed; 0 is stationary |
| `roughness` | 0.3–0.9；默认 / default 0.68 | 高光的粗糙程度 / Surface roughness |
| 全局 seed / Global seed | 0–4,294,967,295 | 确定性生成种子 / Deterministic generation seed |

离线入口为 `index.html#iridescent-terrain`。默认截图使用 seed 42、默认参数、固定镜头与暂停状态；具体相机和图像校验值由 [截图索引](../screenshots/manifest.json) 记录。暂停保持当前穿行位置，重置恢复当前参数与 seed 下的初态。浏览器、GPU 和抗锯齿差异可能改变像素，但不应改变同一输入下的场函数。

The offline entry is `index.html#iridescent-terrain`. Its default screenshot uses seed 42, default parameters, a fixed camera and paused state; the [capture manifest](../screenshots/manifest.json) records the actual camera and image checksum. Pause holds the travel position, and reset restores the initial state under the current parameters and seed. Browsers, GPUs and antialiasing may change pixels, while the field function should remain consistent for identical inputs.

## 验证关注点 / Validation Considerations

数学检查应覆盖密度的确定性、有限输入与边界、生成缓冲的有限值、三角形非退化、场梯度连续性、共享边定向及相邻块边界一致性。状态检查应覆盖任务失效、回退、队列与活动块上限，以及销毁后没有重新挂载资源。浏览器检查应包括初次离线加载、连续穿行、改变参数、暂停与重置、PNG 导出、窄屏和反复切换。实测结果以 [验收报告](../QA_REPORT.md) 与 [机器记录](../qa/terrain-report.json) 的日期及 bundle SHA 为准，历史记录不能替代当前构建的验证。

Math checks should cover deterministic density, finite inputs and bounds, finite output buffers, nondegenerate triangles, field-gradient continuity, directed shared edges and neighboring chunk boundaries. State checks should cover invalidation, fallback, queue and active-chunk limits, and prevention of resource reattachment after disposal. Browser checks should cover first offline load, continuous travel, parameter changes, pause and reset, PNG export, narrow screens and repeated switching. Follow the dates and bundle SHA in the [validation report](../QA_REPORT.md) and [machine-readable results](../qa/terrain-report.json); historical results do not validate the current build.

极长距离会降低 GPU 材质噪声的浮点精度；区块坐标有明确上限，持续穿行不承诺无限精度。换新世界或重置可回到原点。

Very long travel can reduce GPU material-noise precision. Chunk coordinates have an explicit bound; continuous travel does not promise infinite precision. Reset or choose a new world to return to the origin.

算法阅读：[Paul Bourke · Polygonising a scalar field / tetrahedrons](https://paulbourke.net/geometry/polygonise/)。网格实现为本项目独立代码，未复制页面代码。

Algorithm reference: [Paul Bourke · Polygonising a scalar field / tetrahedrons](https://paulbourke.net/geometry/polygonise/). The mesh extractor is independently implemented; no page code is copied.

连续飞行会在每个区块行程的中点（距下一边界 12 m）预加载下一排，最多暂存 3 块，仍只显示 15 块。后台生成期间继续移动；只有抵达边界而下一排仍未完成时才暂缓，整排就绪后原子替换。结构参数整体重建仍保留当前可见集合再替换。

Continuous flight prefetches the next row halfway through each chunk interval, 12 m before the next boundary. At most three chunks are staged while only 15 remain mounted. Movement continues during generation and pauses only at a boundary if the next row is incomplete; completed rows swap atomically. Full structural regeneration still retains the current visible set until its replacement is ready.

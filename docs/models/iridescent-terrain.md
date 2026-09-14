# 虹彩异境 / Iridescent Strata

本实验的视觉参考是 Cristian Peñas（[@ilumine_ai](https://x.com/ilumine_ai)）于 **2026-09-11** 发布的 [X 视频](https://x.com/ilumine_ai/status/2098342499865821654)，参考核验日期为 **2026-09-14**。可见特征包括黑色背景、多层悬浮岩片、孔洞与分离碎片、蓝紫粉金的虹彩高光，以及低空穿行的视差。参考帖描述 “infinite terrain variations”；关联帖使用 “procedural latent space” 一词。未获取或核验作者源代码及生成算法，因此这些表述不能作为本实现使用神经网络的证据。

The visual reference is Cristian Peñas ([@ilumine_ai](https://x.com/ilumine_ai))'s [X video](https://x.com/ilumine_ai/status/2098342499865821654), published on **2026-09-11** and reviewed on **2026-09-14**. Visible features include a black background, layered floating rock shelves, holes and detached fragments, blue/violet/pink/gold iridescent highlights, and low-flight parallax. The reference mentions “infinite terrain variations,” and a related post uses “procedural latent space.” The author's source code and algorithm have not been obtained or verified; those phrases do not establish neural-network use in this implementation.

这是独立编写的程序化图形教学模型，不是作者算法的精确复现，不主张新的数学发现，也不归类为 AI 发现的数学结构。运行时无需模型 API、外部纹理、视频或网络服务；参考链接仅用于来源说明。

This is an independently written procedural graphics teaching model, not an exact reconstruction of the author's algorithm, a claim of new mathematics, or an AI-discovered mathematical structure. Runtime use needs no model API, external textures, video or network service; reference links provide attribution only.

## 密度场与几何 / Density and Geometry

与沙丘的单值高度函数 `y = h(x,z)` 不同，这里使用三维标量密度场 `Dθ(x,y,z)`，正值为实体，以 `Dθ = 0` 的等值面表示岩层边界。分层结构、平滑噪声与孔洞控制共同决定该场；θ 包含 seed 和结构参数。同一 `(x,y,z,θ)` 产生相同密度，因而相邻分块能够沿共同的世界坐标采样。三维等值面可以同时表示岩片上下表面、悬空层和穿孔。

Unlike the dunes' single-valued height function `y = h(x,z)`, this scene uses a 3D scalar density field `Dθ(x,y,z)`, where positive values are solid and the isosurface `Dθ = 0` represents rock boundaries. Layering, smooth noise and hole controls define the field; θ includes the seed and structural parameters. Identical `(x,y,z,θ)` inputs produce identical densities, allowing adjacent chunks to sample shared world coordinates. A 3D isosurface can represent upper and lower rock surfaces, floating layers and holes together.

实际组合是 `D = min(S, 2.2P, H/2 − 0.8 − |y|, C)`。其中 `S = T − |sin(π(y+W)/s)|s/π` 是厚度参数为 T、经过位移 W 的层带（中心附近完整厚度约为 2T），层间距 `s = 5.2/layers`；T、W 与孔洞场 P 使用固定 seed 的平滑 value noise。`holes` 调节孔洞噪声的空间尺度。C 挖出半径 1.05、中心在 `y≈2.2` 附近缓慢起伏的空中通道，服务于观赏视角。这个组合是隐式密度，不是 signed distance function，不能把密度值直接用作 sphere tracing 的安全步长。

The actual composition is `D = min(S, 2.2P, H/2 − 0.8 − |y|, C)`. Here `S = T − |sin(π(y+W)/s)|s/π` gives layers with thickness parameter T and displacement W (full width is approximately 2T near a band center), with spacing `s = 5.2/layers`. T, W and the perforation field P use smooth, seeded value noise. `holes` changes the spatial scale of perforation noise. C cuts an air corridor of radius 1.05, with its center undulating near `y≈2.2`, for the viewing path. This is implicit density, not a signed distance function; density values are not safe sphere-tracing step lengths.

每个采样立方体沿同一体对角线拆成六个四面体，再对符号相异的边进行线性插值。例如边端点的密度为 `d₀,d₁`，零点的插值系数为 `t = d₀ / (d₀ − d₁)`，位置为 `(1−t)p₀ + tp₁`。这就是本实现的 **Marching tetrahedra**，不是 Marching Cubes。外向法线为 `−∇D / |∇D|` 的数值近似，使用世界坐标与步幅 0.018 的中心差分。实际场函数、参数验证与网格提取以 [数学源码](../../src/math/iridescent-terrain.js) 为准。

Each sampled cube is divided into six tetrahedra along the same body diagonal, then edges with opposite density signs are interpolated linearly. For endpoint densities `d₀,d₁`, the zero-crossing coefficient is `t = d₀ / (d₀ − d₁)`, giving position `(1−t)p₀ + tp₁`. This implementation uses **Marching tetrahedra**, not Marching Cubes. Outward normals approximate `−∇D / |∇D|` using central differences with step 0.018 in world coordinates. The [math source](../../src/math/iridescent-terrain.js) defines the actual field, parameter validation and extraction.

等值面是采样近似。小于网格尺度的孔洞或薄片可能消失，改变画质也可能改变这些小尺度细节。网格不是地质模拟，不保证所有碎片构成单一连通体，也不用于严格体积、拓扑或曲率证明。

The isosurface is a sampled approximation. Holes or sheets smaller than the grid scale may disappear, and quality changes may alter such fine details. The mesh is not a geological simulation, does not promise a single connected solid, and is not suitable for rigorous claims about volume, topology or curvature.

## 材质、飞行与离线生成 / Material, Flight and Offline Generation

材质使用 Three.js r180 的 [MeshPhysicalMaterial](https://threejs.org/docs/#api/en/materials/MeshPhysicalMaterial) 金属与薄膜虹彩能力，配合本地生成的环境照明、黑色背景及已有泛光。颜色会随视角、法线和照明变化；这是一套艺术化材质参数，不是对参考物体真实薄膜厚度或光谱反射率的测量。黑色背景与环境照明分别设置，保留金属表面的反射层次。

Materials use metalness and thin-film iridescence from Three.js r180's [MeshPhysicalMaterial](https://threejs.org/docs/#api/en/materials/MeshPhysicalMaterial), with locally generated environment lighting, a black background and the existing glow pass. Color responds to the view, normals and lighting. These are artistic material parameters, not measurements of the reference object's physical film thickness or spectral reflectance. Background and environment illumination are configured separately to retain visible metallic reflections.

持续穿行通过移动世界与有界分块加载呈现：窗口为 3 列、5 行共 15 块，每块横向尺寸 24×24、高度范围 20；高画质每轴采样 36 个单元，低画质 24 个。前方生成、后方回收，所谓持续探索不等于一次创建或保存无限几何。块顶点采用局部 x/z 坐标，密度与法线仍按原始世界坐标采样，以减少长距离移动时的顶点精度损失。世界平移保留全局 Orbit 相机的旋转和缩放；模型未提供地形碰撞与自动避障，手动视角可能穿入几何或看到窗口边界。

Continuous travel uses world translation and a bounded 3-column, 5-row window of 15 chunks. Each chunk spans 24×24 horizontally and 20 vertically, sampled with 36 cells per axis in high quality or 24 in low quality. Chunks generate ahead and recycle behind; continuing exploration does not create or store infinite geometry at once. Vertex x/z positions are chunk-local while density and normals retain original world coordinates, reducing vertex precision loss during travel. World translation preserves rotation and zoom through the shared orbit camera. There is no terrain collision or automatic obstacle avoidance, so manual views may enter geometry or reveal window boundaries.

分块生成优先运行在由离线 bundle 内嵌代码创建的 Blob Worker 中；Worker 不可用或创建失败时，回退到按块调度的主线程生成，块内计算仍为同步操作。Worker 运行错误由统一错误入口报告。结构参数改变会失效旧任务，场景销毁需要终止 Worker、撤销 Blob URL，并释放网格和环境资源。主循环更新飞行位置与材质状态，不在每帧完整重建地形。

Chunk generation preferably runs in a Blob Worker created from code embedded in the offline bundle. If workers are unavailable or construction fails, a scheduled main-thread fallback yields between chunks, while computation within each chunk remains synchronous. Worker runtime errors go through the shared error path. Structural changes invalidate stale jobs. Disposal must terminate the worker, revoke its Blob URL, and release meshes and environment resources. The frame loop updates flight and material state rather than rebuilding the entire terrain every frame.

## 参数与复现 / Parameters and Reproduction

三个预设使用同一组参数和同一生成规则。全局 seed、结构参数与世界位置决定地形；相机、虹彩与粗糙度决定画面表现。改变材质或速度不会改写几何定义。

Three presets use the same parameters and generation rules. The global seed, structural parameters and world position determine terrain; the camera, iridescence and roughness determine appearance. Material or speed changes do not redefine the geometry.

| 参数 / Parameter | 范围 / Range | 含义 / Meaning |
| --- | --- | --- |
| `layers` | 0.65–1.55 | 地层密度，越大则层间距越小 / Layer density; higher values reduce spacing |
| `holes` | 0.65–1.8 | 孔洞噪声的空间尺度 / Spatial scale of perforation noise |
| `iridescence` | 0–1 | 薄膜虹彩强度 / Thin-film iridescence strength |
| `speed` | 0–6 | 世界穿行速度；0 静止 / World travel speed; 0 is stationary |
| `roughness` | 0.15–0.65 | 高光的粗糙程度 / Surface roughness |
| 全局 seed / Global seed | 0–4,294,967,295 | 确定性生成种子 / Deterministic generation seed |

离线入口为 `index.html#iridescent-terrain`。默认截图使用 seed 42、默认参数、固定镜头与暂停状态；具体相机和图像校验值由 [截图索引](../screenshots/manifest.json) 记录。暂停保持当前穿行位置，重置恢复当前参数与 seed 下的初态。浏览器、GPU 和抗锯齿差异可能改变像素，但不应改变同一输入下的场函数。

The offline entry is `index.html#iridescent-terrain`. Its default screenshot uses seed 42, default parameters, a fixed camera and paused state; the [capture manifest](../screenshots/manifest.json) records the actual camera and image checksum. Pause holds the travel position, and reset restores the initial state under the current parameters and seed. Browsers, GPUs and antialiasing may change pixels, while the field function should remain consistent for identical inputs.

## 验证关注点 / Validation Considerations

数学检查应覆盖密度的确定性、有限输入与边界、生成缓冲的有限值、三角形非退化、法线方向及相邻块边界一致性。状态检查应覆盖任务失效、回退、队列与活动块上限，以及销毁后没有重新挂载资源。浏览器检查应包括初次离线加载、连续穿行、改变参数、暂停与重置、PNG 导出、窄屏和反复切换。本次实测结果见 [1.2 验收报告](../QA_REPORT.md) 与 [机器记录](../qa/terrain-report.json)；1.1 历史记录单独保留。

Math checks should cover deterministic density, finite inputs and bounds, finite output buffers, nondegenerate triangles, normal orientation and neighboring chunk boundaries. State checks should cover invalidation, fallback, queue and active-chunk limits, and prevention of resource reattachment after disposal. Browser checks should cover first offline load, continuous travel, parameter changes, pause and reset, PNG export, narrow screens and repeated switching. See the [1.2 validation report](../QA_REPORT.md) and [machine-readable results](../qa/terrain-report.json) for actual checks; the historical 1.1 report is retained separately.

极长距离会降低 GPU 材质噪声的浮点精度；区块坐标有明确上限，持续穿行不承诺无限精度。换新世界或重置可回到原点。

Very long travel can reduce GPU material-noise precision. Chunk coordinates have an explicit bound; continuous travel does not promise infinite precision. Reset or choose a new world to return to the origin.

算法阅读：[Paul Bourke · Polygonising a scalar field / tetrahedrons](https://paulbourke.net/geometry/polygonise/)。网格实现为本项目独立代码，未复制页面代码。

Algorithm reference: [Paul Bourke · Polygonising a scalar field / tetrahedrons](https://paulbourke.net/geometry/polygonise/). The mesh extractor is independently implemented; no page code is copied.

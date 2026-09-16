# FORMA 1.2.1 验收报告 / Validation Report

验收日期：2026-09-14。**18/18 实验离线运行，118/118 数学与状态测试通过。** 本版修复虹彩地形的面片朝向与接缝观感，采用圆润体积层、连续淡彩、宽高光和局部遮蔽，并提前加载前方地形。[前后对比](comparisons/iridescent-terrain.jpg) 使用同一相机、seed 42 和暂停时间 0；两边均为本应用截图。历史结果保留在 [1.2](QA_BASELINE_1.2.md)、[1.1](QA_BASELINE_1.1.md) 和 [1.0](QA_BASELINE_1.0.md)。

Validated on 2026-09-14. **All 18 scenes run offline and all 118 math/state tests pass.** This version fixes terrain face orientation, adds rounded volumes, continuous pastels, broad highlights and local occlusion, and prefetches terrain ahead. The [before/after comparison](comparisons/iridescent-terrain.jpg) uses the same camera, seed 42 and paused time 0; both sides are actual application captures. Historical results are preserved separately.

## 改动与验证 / Changes and Validation

旧算法按光照法线逐三角面翻转，导致部分内部共享边方向重复，背面剔除后形成三角缺口。先加入失败用例，再按四面体实体到空气方向固定面片绕序。共享边现在反向配对，光照法线不会改变拓扑。平滑交集、低频与中尺度密度起伏取代薄硬层片；顶点位置、法线和新增遮蔽值在相邻区块边界一致。

The previous extractor flipped each triangle using shading normals, producing same-direction interior edges and triangular gaps under backface culling. A failing regression preceded the fix: face winding now follows the tetrahedron's solid-to-air direction. Interior edges pair in opposite directions, and lighting normals do not alter topology. Smooth intersections and low/medium-scale density replace thin, hard shelves; positions, normals and occlusion match at chunk boundaries.

颜色由两个低频空间场连续混合，删除循环色带与高频颗粒法线。金属度从 0.88 降至 0.06，薄膜虹彩实际值为控件的 0.08 倍；默认粗糙度 0.68。高/低画质使用 48/32 个单元。新增 AO 每顶点采样八次世界密度，仅在区块生成时计算；它不是实时阴影或真实体积散射。

Two low-frequency spatial fields blend color continuously, replacing cyclic bands and high-frequency grain normals. Metalness drops from 0.88 to 0.06, physical iridescence is scaled to 0.08 of its control, and default roughness is 0.68. High/low quality use 48/32 cells. New vertex occlusion uses eight world-density probes during chunk generation; it is not real-time shadowing or volumetric scattering.

新预加载在边界前 12 m 启动，生成期间继续飞行。只挂载 15 块、最多暂存下一排 3 块；到边界时整排原子替换。只有下一排未完成时才暂缓，避免进入未生成区域。状态测试覆盖预加载时继续移动、慢任务边界等待、整排交换、重置/退出释放和过期任务。

Prefetch starts 12 m before the next boundary while flight continues. Only 15 chunks are mounted, with at most three next-row chunks staged. Rows swap atomically at the boundary. Incomplete rows temporarily hold travel there. State regressions cover continued movement, slow-worker boundary waits, atomic swaps, reset/disposal and stale tasks.

## 浏览器结果 / Browser Results

| 检查 / Check | 结果 / Result | 记录 / Evidence |
| --- | --- | --- |
| 离线启动 / Offline | 18/18，零远程请求与错误 / no remote requests or errors | [offline](qa/offline-report.json) |
| 预设 / Presets | 54 桌面 + 54 触控模拟 / desktop + touch | [presentation](qa/presentation-report.json) |
| 地形参数 / Terrain parameters | 3 预设、10 边界，seed/reset PNG 哈希复现 / presets, bounds, reproducible PNG | [terrain](qa/terrain-report.json) |
| 连续飞行 / Travel | 75.3 m；20 次目录切换资源稳定 / stable resources over 20 switches | [terrain](qa/terrain-report.json) |
| 取消与回退 / Cancellation and fallback | 4 次加载中止；37 Worker 创建 = 37 终止；无 Worker 回退通过 / 4 aborts, all workers terminated, fallback passes | [terrain](qa/terrain-report.json) |
| 手机 / Mobile | 390×844、触控、横竖屏相机复位、PNG、无横向溢出 / touch, framing, PNG, no overflow | [terrain](qa/terrain-report.json) |

当前离线包、图集和三个最终浏览器报告使用同一 bundle SHA。缺失/损坏 bundle 的故障检查仍显示 Trace ID 和恢复入口。源 seed 恢复与 reset 的 PNG 在同一浏览器会话逐字节一致；不承诺跨 GPU/浏览器像素相同。浅色地形上的测量文字新增深色衬底，并在最终截图中检查可读性。

The current bundle, gallery and three final browser reports share one bundle hash. Missing/malformed bundles still show a Trace ID and recovery UI. Restored-seed and reset PNGs match byte-for-byte within one browser session; cross-GPU/browser pixel identity is not promised. Dark backplates maintain measurement-text contrast over the pale terrain and were checked in final captures.

## 性能与范围 / Performance and Scope

Apple M3 Pro，macOS arm64，Chrome 152.0.7977.83，headless，1280×800、DPR 1、高画质。独立真实时钟播放 5.346 秒，末尾短窗口采样 **56 FPS**，采样时正在预载前方地形。更细的网格与遮蔽计算提高一次性生成成本，交换时不重新计算整幅几何。

Apple M3 Pro, macOS arm64, headless Chrome 152.0.7977.83, 1280×800, DPR 1, high quality. A separate real-clock page ran for 5.346 seconds and sampled **56 FPS** in its final short window, while prefetching terrain. Finer grids and occlusion increase chunk-generation cost; row exchanges do not rebuild the entire world.

手机验收是同一 Mac 的触控模拟，不是 iOS/Android 真机或长期热稳定性测试。渲染资源计数检查不替代完整堆/驱动泄漏分析。云屿仍为实体表面近似，未模拟真实云雾的体积散射；小于网格尺度的特征可能消失。手动镜头可离开有限窗口，极长距离的材质噪声受浮点精度限制。作者原算法尚未核验。

Mobile checks emulate touch on the same Mac, not physical devices or sustained thermal behavior. Renderer counts do not replace exhaustive heap/driver analysis. Floating forms remain a solid-surface approximation without cloud volumetric scattering. Fine features can disappear below grid resolution; manual cameras can leave the window and long-distance material noise loses floating-point precision. The reference author's algorithm remains unverified.

## 产物 / Artifacts

18 张 1280×800 JPEG，共 1,807,237 bytes；另有一张 1600×544 的前后对比图，163,365 bytes。索引记录图像哈希、参数、相机、来源与源码。截图使用虚拟时钟，画面 FPS 不作为性能证据。

18 JPEGs at 1280×800 total 1,807,237 bytes, plus a 1600×544 comparison of 163,365 bytes. Indexes record hashes, parameters, cameras, citations and source paths. Captures use virtual time; displayed FPS is not performance evidence.

[图集 / Gallery](EXAMPLES.md) · [截图索引 / Screenshot manifest](screenshots/manifest.json) · [对比来源 / Comparison provenance](comparisons/iridescent-terrain.json)

```sh
npm test
npm run build
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/terrain-check.mjs
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/offline-check.mjs
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/presentation-check.mjs
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/capture-examples.mjs
python3 scripts/compare-terrain.py  # Pillow required
```

Offline bundle: 909,919 bytes. SHA-256:

`eea289fa7e8dcc17a3a50e2bad43a4f14631efb9707572287084bb9d05e323f1`

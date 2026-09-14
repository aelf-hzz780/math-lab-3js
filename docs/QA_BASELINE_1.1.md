# FORMA 1.1 验收报告 / Validation Report

验收日期：2026-09-10。**17/17 实验运行，89/89 数学与状态测试通过。** 新增七项专题，最终离线包、截图与三个浏览器验收报告使用同一 SHA-256。上一版验收保留在 [QA_BASELINE_1.0.md](QA_BASELINE_1.0.md)。

Validated on 2026-09-10. **All 17 experiments run and all 89 math/state tests pass.** The seven additions, final offline bundle, screenshots, and three browser reports share the same bundle checksum. The previous report is preserved separately.

## 结果 / Results

- 17/17 场景在 Chrome `file://` 离线加载，0 运行期 HTTP(S) 请求、0 页面/着色器错误。 / All 17 scenes load offline with zero runtime HTTP(S) requests or page/shader errors.
- 51 个预设分别在桌面点击、390×844 触屏模拟点击，共 102 次，参数逐项匹配。 / 51 presets each passed desktop and touch-emulated interaction, 102 activations with matching parameters.
- 新增七项共 99 次独立参数边界/选项检查，17 个动作入口；语义断言覆盖选中方向、测量点、模变换、投影 seed、图选边等。 / The additions passed 99 independent parameter cases and 17 actions, with semantic assertions for selected directions, measurement points, transformations, seeds, and edges.
- 新增七项均真实导出 PNG，校验文件签名与非空内容。 / Each new scene exported a real PNG with a valid signature and nonempty content.
- 3 轮 × 17 项 = 51 次连续目录切换，后两轮每项 geometry/texture 数量完全一致。 / After 51 switches, per-scene geometry/texture counts matched between the last two rounds.
- 手机触控预设、抽屉、原理面板、模式切换、低动态偏好和无水平溢出检查通过。 / Touch presets, drawers, theory panels, presentation modes, reduced motion, and horizontal overflow checks pass.
- 模拟 bundle 缺失和语法损坏均显示 Trace ID 与恢复入口，没有永久加载提示。 / Missing and malformed bundles produce a Trace ID and recovery UI rather than a permanent loading screen.

## 环境与性能 / Environment and Performance

Apple M3 Pro，macOS arm64，Node.js v26.5.0，Chrome 152.0.7977.83。新增场景测量为 1280×800、DPR 1、高画质；每项播放约 1.8 秒，读取约一秒 FPS 窗口。全部七项采样为 60 FPS。触屏验收是同一台 Mac 的 390×844、DPR 2 模拟，应用低画质 DPR 上限 1，不能当作 iOS/Android 真机或长期热稳定性测量。

Apple M3 Pro, macOS arm64, Node.js v26.5.0, Chrome 152.0.7977.83. New-scene measurements use 1280×800, DPR 1, high quality, and roughly 1.8 seconds of playback with an approximately one-second FPS window. All seven sampled 60 FPS. Touch checks emulate 390×844 at DPR 2 on the same Mac, with app rendering capped at DPR 1 in low quality; these are not mobile-device or sustained thermal measurements.

| 实验 / Scene | FPS | 参数检查 / Parameter cases | 动作 / Actions | PNG bytes |
|---|---:|---:|---:|---:|
| `real-kakeya` | 60 | 14 | 2 | 357,566 |
| `boltzmann` | 60 | 17 | 2 | 224,601 |
| `torus-knot` | 60 | 12 | 2 | 244,631 |
| `moduli` | 60 | 8 | 4 | 148,448 |
| `noperthedron` | 60 | 16 | 2 | 190,173 |
| `e8` | 60 | 15 | 2 | 560,986 |
| `matroid` | 60 | 17 | 3 | 158,429 |

资源检查针对 renderer 记录的几何与纹理计数，不替代完整堆内存、驱动泄漏或后台长时间压力测试。

Resource checks cover renderer geometry/texture counts, not exhaustive heap, driver-leak, or long-running background stress analysis.

## 数学与交互回归 / Mathematical and Interaction Regressions

E8 验证 240 根、范数、56 邻居与反射闭包；K4 验证 16 个基、交换公理、Matrix–Tree 独立评分、对数凹与 Lorentzian 谱。Noperthedron 验证作者编号的 90 顶点、152 支持面、对称性、Euler 特征、正交投影和立方体严格包含见证。其余测试验证硬球能量与含墙动量守恒、帧率一致性、Kakeya 估计、曲线积分及模变换。

E8 tests verify 240 roots, norms, degree 56, and reflection closure. K4 tests verify 16 bases, basis exchange, the Matrix–Tree theorem, log concavity, and Lorentzian signatures. Noperthedron tests verify 90 ordered vertices, 152 supporting faces, symmetry, Euler characteristic, orthogonal projections, and a strict cube-containment witness. Other tests cover collisions, gas-plus-wall momentum, frame consistency, tube estimates, curve integration, and modular transformations.

独立复核发现并修复：模空间连续 T 操作导致网格增长、显示选项意外清空变换、环面结拾取将弧长 UV 当作原参数。新增回归分别先复现失败再通过；网格线预算 ≤40，浏览器另检查连续 129 次 T 操作与显示参数保持变换。

Independent review found and fixed unbounded modular-grid growth, display options clearing transformations, and knot picking confusing arc-length UV with curve phase. Regressions reproduced the failures before passing. Grid lines are capped at 40; browser checks additionally cover 129 T operations and transform preservation under display changes.

## 截图与产物 / Screenshots and Artifacts

17 张真实 JPEG，1280×800、质量 82，共 1,727,857 bytes（1.65 MiB）。固定 seed 42 与相机。海水与硬球播放 2 秒后暂停；硬球另含初始 2.4 模型秒预演。截图使用虚拟时钟，画面 FPS 不作为性能数据。图像尺寸、SHA-256、源码路径、来源和模拟状态见 [manifest](screenshots/manifest.json)。

17 actual JPEG screenshots at 1280×800, quality 82, totaling 1,727,857 bytes (1.65 MiB), with seed 42 and fixed cameras. Ocean and gas advance for two seconds; gas also includes its initial 2.4-model-second warmup. Screenshot clocks are virtual and displayed FPS values are not performance evidence. The manifest records image dimensions, checksums, source paths, citations, and captured state.

Offline bundle: 884,852 bytes. SHA-256:

`f34a76e9d27182f7b2896cb990c5adac5f24c8acd4466aff55fced7539464a4c`

## 证据与复现 / Evidence and Reproduction

- [新增参数、动作、资源与窄屏 / Additions checks](qa/additions-report.json)
- [预设、真实触控与镜头策略 / Presets, touch, camera policy](qa/presentation-report.json)
- [离线启动与错误恢复 / Offline startup and recovery](qa/offline-report.json)
- [效果图集 / Gallery](EXAMPLES.md) · [研究边界 / Research boundaries](ADDITIONS.md)

```sh
npm ci
npm test
npm run build
# Install Playwright and Chrome as described in README, or set PLAYWRIGHT_MODULE.
node scripts/additions-check.mjs
node scripts/presentation-check.mjs
npm run check:offline
npm run capture:examples
```

公开交付为源码、离线应用与示例仓库。未部署托管站点，也未进行 Safari 或手机真机验收。数学近似和证明范围按各场景说明保留。

Delivery includes source, the offline application, and examples. No hosted site deployment, Safari acceptance, or physical mobile-device test is claimed. Each scene retains its mathematical approximations and proof boundaries.

历史产物固定在 [1.1 提交](https://github.com/aelf-hzz780/math-lab-3js/tree/bfacc07e135838038a4b82f5e47b9f526d0a3e67/docs/qa)。

Historical artifacts are pinned to the [1.1 commit](https://github.com/aelf-hzz780/math-lab-3js/tree/bfacc07e135838038a4b82f5e47b9f526d0a3e67/docs/qa).

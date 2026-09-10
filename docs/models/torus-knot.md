# 环面结与点对 distortion / Torus knots and pairwise distortion

该实验采用显式环面曲线来说明“沿曲线走”与“穿过空间”的距离差异。历史依据是 Pardon 2011 年关于嵌入曲面上结的 distortion 的论文；2026 Fields Medal 只作为理解其研究方向的背景，不把此可视化标成 2026 年新发现的结。

This experiment uses an explicit torus curve to compare distance along a curve with distance through ambient space. Its historical reference is Pardon's 2011 paper on distortion of knots on embedded surfaces. The 2026 Fields Medal supplies research context; this visualization does not label torus knots as a new 2026 discovery.

对于 `d = gcd(p,q)`，定义 `p′ = p/d`、`q′ = q/d`，第 `k` 个分支使用 `α = p′t`、`β = q′t + 2πk/p`，其中 `0 ≤ k < d`。坐标为 `((R + r cos β) cos α, r sin β, (R + r cos β) sin α)`。参数始终满足 `R > r > 0`。互素时是一个结；否则明确显示为有 `d` 个分支的 link。

For `d = gcd(p,q)`, let `p′ = p/d` and `q′ = q/d`. Component `k` uses `α = p′t` and `β = q′t + 2πk/p`, with `0 ≤ k < d`. Its coordinates are `((R + r cos β) cos α, r sin β, (R + r cos β) sin α)`, always with `R > r > 0`. Coprime windings give one knot; otherwise the interface identifies a link with `d` components.

中心曲线的速度为 `sqrt((r q′)² + p′²(R+r cos β)²)`。短弧取正向和反向积分的较小值；弦长直接由两个空间坐标计算。高画质使用 1,024 段 Simpson 积分，低画质使用 512 段。相同点的比值显示“未定义”。金色管与管壁厚度均只用于显示，测量不沿管壁进行。

The centerline speed is `sqrt((r q′)² + p′²(R+r cos β)²)`. The shorter arc is the smaller of the forward and backward integrals, and the chord is the Euclidean distance between endpoints. High and low quality use 1,024 and 512 Simpson subdivisions respectively. Coincident points produce an undefined ratio. Gold highlighting and tube thickness are display features; measurements follow the centerline.

当前读数只是选定点对的比值。它没有计算曲线上所有点对的上确界，也没有对某个结型的所有嵌入取最优值。因此不能把该读数称作结型 distortion，或用它验证 Pardon 的证明。

The displayed value belongs to one selected pair. It neither computes the supremum over every pair on the curve nor optimizes over every embedding of the knot type. It therefore is not the knot type's distortion and does not verify Pardon's proof.

点击管面可交替选择 A/B；选择不同分支会将两点同时移到该分支。TubeGeometry 的 UV 横坐标按归一弧长采样，拾取时通过曲线的 `getUtoTmapping` 还原控制参数的相位，避免把弧长比例直接当作相位。动画仅推进少量示踪点。积分与 TubeGeometry 重建只在交互改变参数时执行；不会在每帧做点对扫描。切换场景统一释放几何、材质与 CanvasTexture。

Clicking a tube alternates selection between A and B. Selecting another component moves both measurements onto that component. TubeGeometry's horizontal UV coordinate samples normalized arc length; picking uses the curve's `getUtoTmapping` to recover the controls' phase parameter instead of equating arc fraction with phase. Animation only advances a small set of tracers. Integration and tube rebuilding occur on parameter changes, with no pairwise search per frame. Scene disposal releases geometries, materials, and label textures.

测试覆盖分支数、闭合性、承载环面方程、解析速度与数值微分、短弧积分收敛、点对交换对称、缩放不变性、重合点与输入边界。运行 `node --test tests/torus-knot.test.js`。

Tests cover component counts, closure, the carrier-torus equation, analytic speed against numerical differentiation, quadrature convergence, pair symmetry, scale invariance, coincident endpoints, and invalid inputs. Run `node --test tests/torus-knot.test.js`.

- [Pardon, Annals of Mathematics (2011)](https://annals.math.princeton.edu/2011/174-1/p21)
- [Original preprint, arXiv:1010.1972](https://arxiv.org/abs/1010.1972)
- [IMU Fields Medals 2026](https://www.mathunion.org/imu-awards/fields-medal/fields-medals-2026)

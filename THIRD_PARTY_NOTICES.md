# Third-party notices

## Three.js r180

Copyright © 2010–2025 Three.js authors. MIT License.

Bundled locally in `vendor/three.core.js` and `vendor/three.module.js`. The original full license is retained in `vendor/LICENSE.txt`. These files were reused from the existing local website prototype without modification.

## Hat monotile generator

Copyright (c) 2023, Craig S. Kaplan. BSD 3-Clause.

Source: <https://github.com/isohedral/hatviz>, commit `4bb9d01999e4e84accc2a78d0fa279ef20b47263`.

Full terms, conditions and disclaimer are in `vendor/hat/LICENSE`; original geometry and substitution files are retained alongside the adapted pure geometry generator. The adaptation removes P5 rendering/UI dependencies and preserves the mathematical substitution rules. No endorsement is implied.

## Station mathematical data

Source: <https://github.com/dualverse-ai/station_data_v2>. Apache License 2.0.

The original license, NOTICE and upstream third-party notices are in `data/STATION-LICENSE`, `data/STATION-NOTICE` and `data/STATION-THIRD-PARTY-NOTICES.md`. The kissing certificates are retained as NPZ and converted losslessly to integer-coefficient JSON by `data/convert-kissing.py`. The original construction is unchanged. The exact artifact hashes and mathematical verification are documented in `docs/CONSTRUCTIONS.md`.

## MAX-4-CUT mathematical fixture

The weighted edge table is attributed to Ansh Nagda, Prabhakar Raghavan and Abhradeep Thakurta, *Reinforced Generation of Combinatorial Structures: Hardness of Approximation*, arXiv:2509.18057v7, Appendix C.1. Only the mathematical edge data is transcribed; no paper illustrations or upstream program implementation are included.

All remaining illustrations, scene geometry, terrain, water, icons and interface visuals are generated procedurally in this project. User-supplied social-media screenshots are references only and are not redistributed.

## esbuild（构建工具）

- 固定开发依赖 0.25.10，MIT 许可；许可证随 `node_modules/esbuild/LICENSE.md` 提供。
- 构建产物不会嵌入 esbuild 运行时。Three.js 与 Hat 的原许可继续适用于 dist/app.js 中打包的相应代码，原许可证保留在 vendor/。

## Noperthedron mathematical coordinates

Mathematical seed coordinates and the 15-fold rotation/central-inversion rule are attributed to Jakob Steininger and Sergey Yurkevich, *A convex polyhedron without Rupert's property*, arXiv:2508.18475v2 (2026-01-28). The reference is `Jakob256/Rupert`, commit `1009a4c451dbdbb1a1705d18461cbabd534a0a6c`, `src/noperthedron.py`. Provenance and integer coefficients are retained in `data/noperthedron.json`.

No repository license was declared when checked on 2026-09-10. This app transcribes mathematical constants and independently implements construction/rendering; it does not redistribute or relicense the upstream Python program or proof notebook. The interactive floating-point projection test is not the authors' computer-assisted certificate.

## Fields Medal teaching models

The new Kakeya, hard-sphere, torus-knot, moduli, E8, and graphic-matroid scenes are project implementations of cited mathematical definitions and teaching models. No paper illustrations, award photographs, or upstream solver implementation are bundled. Research authors, dates, model limits, and original sources are recorded in `docs/ADDITIONS.md` and each scene definition. No endorsement or AI-discovery attribution is implied.

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

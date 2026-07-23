---
layout: docs
title: Solver options reference
description: Complete reference of every HiGHS option available in highs-js.
permalink: /docs/options/
---

# Solver options reference

These are all the options exposed by the HiGHS runtime compiled into highs-js.
You can browse them live (and change them) in the
[Options tab of the web demo]({{ '/' | relative_url }}).

Options use HiGHS `snake_case` names. Set them on a persistent model via
`model.options.set(name, value)` or `model.options.set({ ... })`. The
single-threaded WebAssembly build rejects thread, parallel, and file-path
options — those are intentionally excluded from this list.

This page is regenerated automatically from the live HiGHS runtime during each
release. If you are viewing it before the first release that includes the
generator, the table below may be empty.

| Name | Type | Default | Min | Max |
| --- | --- | --- | --- | --- |
| _Run `npm run docs:options` to regenerate this table._ | | | | |

---
title: Walkthrough record
description: Notes template and status vocabulary for recording a KixetPi walkthrough on real hardware.
---

Use this template to record each stage of a hardware walkthrough. It is a notes template, not executable code. Keep it outside the test card, and remove private addresses, keys, and credentials before sharing it.

Every stage is currently **not tested**. Capture troubleshooting details where a failure occurs before revising the instructions.

```text title="Walkthrough record"
Date and guide revision:
Stage and exact step:
Pi model and RAM:
Image filename, release date, and published checksum:
OS codename, dpkg architecture, and kernel:
Boot storage, power supply, and network connection:
Pre-change backup location and restore check:
Commands run and configuration changes:
Expected result:
Actual result and relevant logs:
Idle available RAM, swap usage, root disk usage, and listening ports:
Workload tested and result after reboot:
Rollback attempted and result:
Status: not tested / passed on this setup / failed / skipped with reason
```

## Status values

| Status | Use it when |
| --- | --- |
| `not tested` | The step has not been run on this target. This is the default for every stage. |
| `passed on this setup` | The command and the section's behavioral check both succeeded on the recorded hardware, image, and configuration. |
| `failed` | A command or behavioral check did not produce the documented result. Record the output and the recovery you performed. |
| `skipped with reason` | The step did not apply (for example, no Bluetooth hardware) or a prerequisite such as console access was unavailable. A skipped control is not a passed control. |

A passing result applies only to the recorded setup. Do not turn an untested suggestion into a claimed default for every Pi. See [what a test result means](/kixetpi/explanation/limits/#what-a-test-result-means).

## Where each field comes from

| Field | Source |
| --- | --- |
| Image, release, and architecture | [Stage 1: identify the installed base](/kixetpi/guides/raspberry-pi-os/#5-confirm-the-release-and-update-normally) |
| Resources, services, and ports | [Stage 1: record an unchanged baseline](/kixetpi/guides/raspberry-pi-os/#6-record-an-unchanged-baseline) |
| Disabled units, removed packages, and changed files | [Stage 2 checkpoint](/kixetpi/guides/dietpi/#checkpoint-and-recovery) |
| Applied and skipped controls; AppArmor coverage | [Stage 3 checkpoint](/kixetpi/guides/kicksecure/#checkpoint) |
| Nix version, locked inputs, generations, and store size | [Stage 4 checkpoint](/kixetpi/guides/nix/#checkpoint) |

AI agents add a separate [agent handoff](/kixetpi/reference/agent-assistance/#leave-a-resumable-record) when pausing or handing over work.

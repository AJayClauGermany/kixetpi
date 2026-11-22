---
title: A leaner, hardened Raspberry Pi
description: Build on Raspberry Pi OS Lite with selected DietPi and Kicksecure practices, then optionally manage user packages with Nix.
---

KixetPi is a guide to adapting Raspberry Pi OS Lite, not a new operating system image. Keep the Raspberry Pi kernel, hardware support, and package sources used by APT, Debian's package manager. Remove what your workload does not need, add selected security controls, and optionally describe your user packages with Nix.

:::caution[Research draft, not a tested system]
These instructions combine upstream documentation with proposed integration choices. No Raspberry Pi model has passed this guide yet. There are no measured memory savings or verified security claims. Use a spare card and a separate test Pi before relying on this setup.
:::

## Follow the four stages

| Stage | What you will do | What stays unchanged |
| --- | --- | --- |
| [1. Set up Raspberry Pi OS Lite](/kixetpi/guides/raspberry-pi-os/) | Choose an image, establish access, update, and record a baseline. | The official Raspberry Pi OS base. |
| [2. Adapt DietPi practices](/kixetpi/guides/dietpi/) | Audit services and packages, keep only what you need, and choose how logs are kept. | No DietPi conversion, repositories, or management scripts. |
| [3. Adapt Kicksecure practices](/kixetpi/guides/kicksecure/) | Reduce remote exposure, verify updates, and check available confinement. | No Kicksecure conversion, replacement kernel, or boot stack. |
| [4. Add Nix optionally](/kixetpi/guides/nix/) | Declare a small user package set with Home Manager. | APT continues to own the operating system. |

Complete each stage's checkpoint before continuing. Stopping after stage 3 is a complete path. Nix is opt-in, not a dependency of the lean or hardened configuration.

## Find what you need

The documentation is organized by what you are trying to do, following the [Diátaxis](https://diataxis.fr/) framework. The stage guides are the main path; the other sections support them.

| You want to… | Go to | Examples |
| --- | --- | --- |
| **Do** the setup on a test Pi | **Build your system** (stages 1–4) | Flash Lite, trial a service stop, enable UFW, activate Home Manager. |
| **Understand** why a step exists or what it can achieve | **Understand the approach** | [Why adapt instead of convert](/kixetpi/explanation/adapt-not-convert/), [Security, performance, and recovery limits](/kixetpi/explanation/limits/). |
| **Look up** a command, placeholder, template, or version | **Reference** | [Conventions and command effects](/kixetpi/reference/conventions/), [Walkthrough record](/kixetpi/reference/walkthrough-record/), [Versions and sources](/kixetpi/reference/versions/). |
| **Test** commands or work **with an AI agent** | **Agents and testing** | [Assisting with an AI agent](/kixetpi/reference/agent-assistance/), [VM command test run](/kixetpi/reference/vm-test-run/). |

## Before you start

You need:

- A Raspberry Pi you can dedicate to testing. A Pi 4 with at least 2 GB of RAM running 64-bit Lite is the proposed first target; other models are covered in [stage 1](/kixetpi/guides/raspberry-pi-os/#1-choose-the-hardware-and-image).
- Two microSD cards (or other supported boot media) that can be erased: one to keep as a known-good baseline, one for experiments.
- An administration computer on the same trusted network, for imaging and SSH.
- A keyboard and display, or a working serial console, for recovery when SSH or the firewall fails.
- Somewhere outside the Pi to keep backups and your [walkthrough record](/kixetpi/reference/walkthrough-record/).

## Use these instructions safely

- Commands on the four guide pages are for the separate Raspberry Pi unless a block's title names your administration computer. See [where a block runs](/kixetpi/reference/conventions/#where-a-block-runs).
- Read the prerequisites and warnings before each block. Explanations and references follow it; complete the result checks before the next step. Do not paste a whole page into a terminal.
- Replace example usernames, addresses, and file paths with your own values. Stop if the documented preconditions do not match your machine.
- Stop on unexpected errors; do not continue to later commands in the block. Expected failures, such as a refused password-only login, are labeled.
- Make one change at a time. Keep an existing SSH session open while testing another, and arrange local console access before access-control changes.
- Keep a known-good full-card backup or spare card outside the Pi. Package lists and copies of `/etc` are useful records, not a bootable recovery image.
- Preserve updates, working name resolution, time synchronization, and useful logs. A smaller system that cannot update or diagnose a failure is not the goal.

Each stage begins with a **What changes and how to recover** table. [What recovery means](/kixetpi/explanation/limits/#what-recovery-means) explains its three levels: inspection, reversible setting, and backup-dependent change.

## Scope in brief

The first target is a headless Pi on a trusted home network, administered from an ordinary account with `sudo`. It is not a guide for a public server, router, high-assurance workstation, or anonymity system. Hardening here reduces exposure; it does not make malicious software safe or establish verified boot, disk encryption, or protection after root compromise. See [Security, performance, and recovery limits](/kixetpi/explanation/limits/) for details.

## Working with an AI agent

The four stages are written for you to follow directly. If an AI agent is helping, give it the [agent assistance companion](/kixetpi/reference/agent-assistance/) for a reading path, decision checkpoints, and handoff notes. It supplements these instructions without turning them into an unattended setup script. Agents that read the site directly can start from [`/kixetpi/llms.txt`](/kixetpi/llms.txt), which points to the companion and to plain-text bundles of these pages.

Before a hardware walkthrough, the [VM command test run](/kixetpi/reference/vm-test-run/) describes a Lima-based Debian ARM64 preflight on an Apple Silicon Mac. It can expose command and integration errors, but does not validate Raspberry Pi hardware or replace the stages' checkpoints.

## Status

Every stage is currently **not tested** on hardware. Upstream documentation supports the individual mechanisms, not this combined setup. Each guide ends with a **Sources and review status** section, and [Versions and sources](/kixetpi/reference/versions/) lists every pinned release and when it was last checked.

Start with [Raspberry Pi OS Lite](/kixetpi/guides/raspberry-pi-os/).

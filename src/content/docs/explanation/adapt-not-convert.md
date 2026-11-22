---
title: Why adapt instead of convert
description: How KixetPi borrows practices from DietPi, Kicksecure, and Nix while Raspberry Pi OS and APT keep ownership of the system.
---

KixetPi changes an official Raspberry Pi OS Lite installation in place. It does not install DietPi, Kicksecure, or NixOS, and it does not produce a new image. This page explains that choice and the ownership rules that follow from it. The [four stage guides](/kixetpi/#follow-the-four-stages) contain the actual procedure.

## Shared foundations are not shared parts

Raspberry Pi OS, DietPi, and Kicksecure all build on Debian. That makes their commands and file layouts look familiar, but it does not make their repositories or configuration packages interchangeable. Each project makes its own choices about:

- kernels, firmware, and boot loaders;
- which machines it supports;
- which services run by default;
- package dependencies and metapackages;
- release and support lifecycles.

Even Raspberry Pi OS is not one archive. The 64-bit edition uses Debian's `arm64` packages, while the 32-bit edition uses Raspbian's `armhf` packages. Both add Raspberry Pi's own repository for kernels, firmware, and tools.

*Distromorphing* means converting an installed Linux distribution into another one, usually by adding the target's repositories and installing its metapackages. DietPi and Kicksecure both document conversion paths, and both warn about what conversion replaces or deletes. On a Pi, conversion also risks the Raspberry Pi kernel, firmware, and boot configuration that make the hardware work. KixetPi avoids those risks by borrowing **practices**, not packages.

## What each project contributes

| Source | Practice borrowed | Not borrowed | Stage |
| --- | --- | --- | --- |
| Raspberry Pi OS Lite | The whole base: kernel, firmware, boot files, networking, APT repositories, and update path. | Desktop image or third-party images. | [1](/kixetpi/guides/raspberry-pi-os/) |
| DietPi | Choose software for the machine's purpose, control optional services, and limit log storage. | `dietpi-installer`, `dietpi-*` tools, DietPi repositories, RAM-only logging, and swap scripts. | [2](/kixetpi/guides/dietpi/) |
| Kicksecure | Grant only needed privileges, expose fewer services, keep updates current, and confine applications where the kernel supports it. | Kicksecure repositories and metapackages, `security-misc`, replacement kernels, boot-stack changes, and large `sysctl` lists. | [3](/kixetpi/guides/kicksecure/) |
| Nix and Home Manager (optional) | Declare user tools in a file, pin their inputs, and roll back user environments. | NixOS modules, `nixos-rebuild`, and Nix-managed system services or login shells. | [4](/kixetpi/guides/nix/) |

## Who owns which part of the system

Once you add a second package manager, every file and service needs a clear owner. Otherwise two tools can fight over the same path, or an update can silently skip something you depend on.

| Owner | Responsibilities |
| --- | --- |
| Raspberry Pi OS and APT | Kernel, firmware, boot files, networking, SSH, firewall, system services, security updates, and the host's system libraries. |
| Local administrator | Reviewed configuration files, backups, service decisions, tests, and recovery. |
| Optional Nix installation | Its package store, build accounts, background service, and package dependencies. These are system-level additions even though this guide uses Nix only for user tools. |
| Optional Home Manager configuration | Selected user tools and explicitly declared home configuration. It must not replace the system's networking, login, or update management. |

Two rules follow from this table:

- Keep system-service executables on APT-managed paths such as `/usr/bin`. Nix packages can bring their own library versions, but they do not replace `/usr/lib`, and APT does not know about them.
- Update each owner with its own tool. APT does not update Nix packages, and Home Manager does not update the operating system.

## Nix is not NixOS

Nix is a package manager that can run beside an existing Linux distribution. NixOS is a separate distribution built around Nix, where the whole system, including the kernel and services, comes from Nix configuration. KixetPi uses only Nix and optional standalone Home Manager configuration. The Nixpkgs branch name `nixos-26.05` is just the name of a stable package set; using it does not turn the Pi into NixOS.

## Why the stages come in this order

1. **Base first.** You cannot judge a reduction or a hardening change without a working, updated system and a recorded baseline to compare against.
2. **Reduce before hardening.** Removing unused services shrinks the list of listening ports and access rules you need to reason about in stage 3.
3. **Harden before optional additions.** Access controls and an update routine should already work before you add a privileged service such as the Nix daemon.
4. **Nix last and optional.** Nix adds a daemon, build accounts, a package store, and a second update routine. It is useful for declarative user tools, but the lean and hardened system is complete without it.

## Further reading

- [DietPi conversion warning](https://dietpi.com/docs/hardware/#make-your-own-distribution) and [Kicksecure Debian conversion](https://www.kicksecure.com/wiki/Debian).
- [Raspberry Pi OS introduction (source)](https://github.com/raspberrypi/documentation/blob/master/documentation/asciidoc/computers/os/rpi-os-introduction.adoc).
- [Nix installation](https://nix.dev/manual/nix/latest/installation/) and [Home Manager manual](https://nix-community.github.io/home-manager/).
- [Security, performance, and recovery limits](/kixetpi/explanation/limits/) for what these practices can and cannot achieve.

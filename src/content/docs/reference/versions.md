---
title: Versions and sources
description: Upstream releases, branches, and manual suites that KixetPi pins or assumes, with the date each was last checked.
---

These are the upstream versions the guides were written against. They move over time. Check this table before a walkthrough, and update it together with the affected guide's **Sources and review status** section.

## Pinned or assumed versions

| Item | Used in | Value in the guides | Last checked | How to re-check |
| --- | --- | --- | --- | --- |
| Raspberry Pi OS Lite image | Stages 1–3 | Debian 13 Trixie; latest Lite image 2026-10-06 (64-bit `arm64` path). Bookworm images are listed as "Legacy". | 22 November 2026 | [Lite release notes](https://downloads.raspberrypi.com/raspios_lite_arm64/release_notes.txt) or the [OS introduction source](https://github.com/raspberrypi/documentation/blob/master/documentation/asciidoc/computers/os/rpi-os-introduction.adoc). |
| Raspberry Pi Imager | Stage 1 | 2.0.12; cloud-init customization for Trixie images; optional "Enable passwordless sudo" | 22 November 2026 | `git ls-remote --tags https://github.com/raspberrypi/rpi-imager` and its release notes. |
| Raspberry Pi OS defaults the guides rely on | Stages 2–3 | Password-required sudo on images since April 2026; RAM-only (`Storage=volatile`) journal; `rpi-swap` with zram and `/var/swap` writeback | 22 November 2026 | Lite release notes, [`raspberrypi-sys-mods`](https://github.com/RPi-Distro/raspberrypi-sys-mods/tree/pios/trixie), and [`rpi-swap`](https://github.com/raspberrypi/rpi-swap). Confirm on the Pi itself. |
| DietPi and Kicksecure references | Stages 2–3 | DietPi v10.9 docs; Kicksecure 18 (Trixie-based), still without Raspberry Pi images | 22 November 2026 | The linked DietPi and Kicksecure wiki pages. |
| Debian manual pages | All stages | `manpages.debian.org/trixie/...` | 22 November 2026 | Prefer the Pi's installed `man` pages; the online suite must match the Pi's release. |
| Nix installer | Stage 4 | 2.35.6 (`aarch64-linux` tarball and [`.sha256`](https://releases.nixos.org/nix/nix-2.35.6/nix-2.35.6-aarch64-linux.tar.xz.sha256)); 2.35.2 and earlier lack the 2.35.3 security fixes | 22 November 2026 | [Release listing](https://releases.nixos.org/?prefix=nix/) and the version that [nixos.org/nix/install](https://nixos.org/nix/install) redirects to. |
| Nixpkgs and Home Manager | Stage 4 | `nixos-26.05` with `release-26.05`; `home.stateVersion = "26.05"`. NixOS 26.05 support ends 31 December 2026; 26.11 branches did not exist yet. | 22 November 2026 | `git ls-remote https://github.com/NixOS/nixpkgs 'refs/heads/nixos-*'` and the same for `nix-community/home-manager` `release-*`. Update both together. |
| Lima | VM test run | 2.2.0 (the probe refuses other versions) | 22 November 2026 | `git ls-remote --tags https://github.com/lima-vm/lima`. Review the profile before accepting a newer release. |
| Debian cloud image | VM test run | `debian-13-genericcloud-arm64-20260712-2537` | 22 November 2026 | [Trixie cloud image index](https://cloud.debian.org/images/cloud/trixie/) and its `SHA512SUMS`. |

## Notes from the latest review

- All external links in the site resolved on 22 November 2026. `www.raspberrypi.com` and `github.com` refuse some automated clients; their content was checked through the Raspberry Pi documentation's AsciiDoc sources and `raw.githubusercontent.com`.
- `nixos.org/manual/nix/stable/` redirects to the Nix 2.34 manual, `nix.dev/manual/nix/latest/` to 2.36, and the live installer to 2.36.0. Stage 4 now links the versioned [2.35 manual](https://nix.dev/manual/nix/2.35/) to match its pin. Read the manual that matches the installer version you choose.
- Lima 2.3.0 and Debian cloud images newer than the pinned one were available. The recorded VM trial used the pinned versions; a re-run on newer versions is a new trial.

## Corrections from the 22 November 2026 review

- **Stage 1:** added the Legacy (Bookworm) image warning, Imager's passwordless-sudo checkbox, key-path, localisation, and cloud-init details, and replaced a broken model-identification anchor.
- **Stage 2:** Raspberry Pi OS keeps the journal in RAM by default. The logging step now presents a persistent journal as an opt-in choice rather than as a limit on an existing one. The swap step now describes `rpi-swap`.
- **Stage 3:** documented the April 2026 sudo default and the `raspi-config` switch, clarified SSH drop-in precedence, added the `PrivateTmp` data-loss warning, and noted that AppArmor may not be active on Raspberry Pi kernels.
- **Stage 4:** moved the Nix pin from 2.35.2 to 2.35.6 for security fixes and linked the versioned 2.35 manual.

## Re-checking sources

1. Re-run the checks in the table above and note any change in release, branch, or default behavior.
2. Read the upstream page behind each **Reference** link that a change affects. A link that still loads can describe changed behavior.
3. Update the guide text, its **Sources and review status** date, and this page together.
4. Do not change a pinned version without reviewing the commands that depend on it, such as checksums, archive layouts, and branch names.

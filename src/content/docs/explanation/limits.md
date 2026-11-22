---
title: Security, performance, and recovery limits
description: What a leaner, hardened Raspberry Pi OS Lite installation can and cannot claim, and what recovery and test results mean.
---

KixetPi aims for fewer unnecessary services, tighter access, and a clear update routine. This page explains the limits of those goals so that you can judge results honestly. Each stage guide repeats the limits that affect its own steps.

## Intended scope

The first target is a **headless** Pi (normally used without a display or keyboard) on a trusted home network, administered from an ordinary account with `sudo` access.

The guides do not cover a public server, router, access point, VPN gateway, container host, high-assurance workstation, or anonymity system. Those roles need different firewall, update, and exposure decisions.

## Smaller is not automatically faster or safer

Fewer running services can mean fewer reachable entry points and less background work. However, each of the following is a separate measurement:

| Measurement | Collected with | What it does not tell you |
| --- | --- | --- |
| Disk space | `df -h` | Whether RAM use changed. Removing an inactive package can free disk without freeing memory. |
| Available memory | `free -h` (the `available` column) | Exposure or security. Filesystem cache is not wasted RAM. |
| Boot time | `systemd-analyze` | Idle memory. A slow-starting service may use little memory once running. |
| Workload responsiveness | Your application, `vmstat 1 10` | Anything unless you compare the same workload under the same conditions. |
| Listening services | `sudo ss -lntup` | Whether an exposed service is vulnerable or well configured. |

Package count alone measures none of these. Lite may already be close to the smallest useful setup for your workload, and a negligible saving is still a valid result.

Do not trade away updates, name resolution, time synchronization, or useful logs for a smaller number. A system that cannot update or explain its own failures is not the goal.

## What hardening does not do

Hardening reduces unnecessary exposure. It does not make malicious software safe:

- A program running as your user can usually read your files and change your shell configuration.
- Password-protected `sudo` is not a sandbox for malicious code in your own account.
- Nix's build sandbox restricts package builds, not programs you run afterward.
- Software run with `sudo` can change the whole system.
- An inbound firewall with outgoing traffic allowed does not stop an allowed program from sending data out.
- Installing AppArmor does not confine an application. The kernel must enable it and the application needs a loaded, enforcing profile.

The guides do not establish verified boot, full-disk encryption, physical security, or protection after root compromise, and they do not reproduce Kicksecure's complete security design. Install software only from sources you trust, and do not keep sensitive credentials on a test Pi.

## What recovery means

Every stage begins with a table titled **What changes and how to recover**. The recovery column uses three levels:

| Level | Examples | What you need |
| --- | --- | --- |
| Inspection | `systemctl status`, `apt-get -s`, `ss -lntup` | Nothing; the command reads state without changing configuration. |
| Reversible setting | Stopping a service, adding a drop-in file, enabling UFW | The recorded original state, and often working console or administrator access. Undo restores the setting, not every side effect. |
| Backup-dependent | Flashing a card, upgrading or removing packages, deleting logs or Nix generations | A separate backup or known-good card made *before* the change. No reverse command reliably undoes these. |

Package lists and copies of `/etc` are useful records, not a bootable recovery image. A known-good spare card restores a working base, but not later application data. Keep important data and walkthrough notes outside the test card.

## What a test result means

KixetPi distinguishes three states for every step:

- **Proposed:** written in a guide but not yet run on the recorded target.
- **Executed:** the command ran, with an exit status and output.
- **Verified:** the stage's behavioral check passed, such as a fresh key-only SSH login after a reboot.

A successful command is not proof of working access, a healthy application, or recovery. A skipped control is not a passed control. A pass applies only to the recorded hardware, image, and configuration; it is not a default for every Pi.

Other checks have narrower meanings:

- A **website build** checks that the documentation renders. It tests none of the Pi commands.
- The [VM command test run](/kixetpi/reference/vm-test-run/) checks Debian ARM64 command behavior. It does not validate Raspberry Pi hardware, firmware, networking, or physical recovery.
- **Upstream documentation** supports individual mechanisms, not this combined setup.

Record results with the [walkthrough record](/kixetpi/reference/walkthrough-record/).

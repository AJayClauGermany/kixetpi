---
title: 2. Adapt DietPi's lean-system practices
description: Audit and reduce Raspberry Pi OS Lite without converting it to DietPi or sacrificing updates and useful logs.
---

Keep Raspberry Pi OS Lite and make only the reductions your workload supports. DietPi provides the model of a small base with deliberately selected services. Its management tools assume a DietPi installation and are not an add-on for Raspberry Pi OS.

:::caution[Untested integration]
Complete the [base setup](/kixetpi/guides/raspberry-pi-os/) and its backup checkpoint first. All commands here run on the test Pi. No savings have been measured, and there is no target package count or RAM figure.
:::

## At a glance

- **Goal:** Keep only the services and packages your workload needs, and make a deliberate, bounded choice about whether logs survive a reboot.
- **Runs on:** The test Pi over SSH, with the known-good card nearby.
- **You need:** Stage 1's [checkpoint](/kixetpi/guides/raspberry-pi-os/#checkpoint-and-troubleshooting) and baseline, and a written list of what the Pi must do.
- **Ends with:** The [checkpoint](#checkpoint-and-recovery): a rebooted, working workload; a record of every change; and a new full-card backup.

## What changes and how to recover

| Action | Recovery limit |
| --- | --- |
| Stop or disable an unused service | Restore its recorded running and enablement states. Keep the known-good card available if access fails. |
| Remove a package | Reinstall if it remains available; configuration and data may need a backup. |
| Keep a bounded journal on disk | Remove the new drop-in to return to the stock RAM-only journal. Logs already discarded are lost unless exported beforehand. |
| Inspect resources and swap | No configuration changes; leave stock swap intact. |

A *drop-in* is a small configuration file placed beside a program's main configuration file. Deleting it undoes the change without editing the main file.

If you set up optional [local save points](/kixetpi/guides/save-points/), the marked steps below name a save point to create first. Restoring it returns system files to that moment without re-flashing. It lives on the same card, so it does not replace the backup.

## What transfers and what does not

| DietPi practice | Adaptation in this guide |
| --- | --- |
| Select software for the machine's purpose. | Review installed packages and removal plans with APT. |
| Control optional background services. | Use Raspberry Pi OS's own systemd units, one at a time. |
| Reduce storage writes and log size. | Keep the stock RAM-only journal, or opt in to a small persistent journal for troubleshooting. Do not copy RAMlog. |
| Tune swap and memory for small boards. | Measure the stock setup first. Defer changes until there is evidence of a problem. |
| DietPi installers and `dietpi-*` tools. | Do not install or run them on this base. |

The [DietPi installer documentation](https://dietpi.com/docs/hardware/#make-your-own-distribution) warns that its conversion deletes existing APT software and user data. Do not run `dietpi-installer`, add DietPi repositories, or copy `/boot/dietpi.txt` and its scripts into Raspberry Pi OS. We are borrowing operating practices, not performing that conversion. [Why adapt instead of convert](/kixetpi/explanation/adapt-not-convert/) explains the reasoning.

## 1. Define the workload and measure

Write down what this Pi must do. Include SSH, Wi-Fi or Ethernet, name resolution, time synchronization, storage mounts, attached devices, and the actual application. A service is not unnecessary just because its name is unfamiliar.

On the Pi, record the output before changing anything:

```sh title="Pi: inspect resource use"
free -h
swapon --show
df -h /
systemd-analyze
sudo journalctl --disk-usage
```

```sh title="Pi: inventory services and packages"
systemctl list-units --type=service --state=running
systemctl list-unit-files --type=service --state=enabled
systemctl list-sockets --all
systemctl list-timers --all
sudo ss -lntup
apt-mark showmanual
```

Use the `available` memory value rather than treating all filesystem cache as wasted RAM. Repeat measurements after a reboot, after the same idle interval, and during the same workload. A service that takes a long time to start does not necessarily use much memory while idle.

**Reference:** the Pi's installed manual pages (`man free`, `man systemctl`, and so on), also in the [Debian manual index](https://manpages.debian.org/trixie/index.html).

Keep these parts unless a separate, tested replacement exists:

- The active network manager, DHCP client, DNS resolver, Wi-Fi components, and remote-access service.
- APT update timers, certificate authorities, and time synchronization.
- Logging, `systemd-logind`, D-Bus, device management, and required storage services.
- Raspberry Pi kernel, firmware, boot, and hardware-support packages.

Do not disable security mitigations, logging, or updates to improve an idle-memory number.

## 2. Trial one unused service

[DietPi-Services](https://dietpi.com/docs/dietpi_tools/system_configuration/#dietpi-services) manages services selectively. Use the same restraint with systemd on Raspberry Pi OS.

This example applies only if `bluetooth.service` exists and the Pi does not use Bluetooth peripherals, networking, or its recovery keyboard. If it is absent or needed, skip the example. Do not replace it with an arbitrary core service.

An inactive or disabled service can produce a nonzero exit status in these checks; that is expected, not a reason to repair or enable it. Record the printed states:

```sh title="Pi: inspect the example service"
systemctl status bluetooth.service --no-pager
systemctl is-enabled bluetooth.service
systemctl is-active bluetooth.service
systemctl cat bluetooth.service
systemctl list-dependencies --reverse bluetooth.service
```

Write down the words these commands print, such as `enabled` and `active`, not just whether they succeeded. Watch for two details:

- `is-enabled` can succeed for `static` or `indirect` as well as `enabled`. The persistent change below applies only to a service that reported `enabled`.
- `list-dependencies --reverse` shows only units currently loaded, not every application that might need Bluetooth.

Also look for sockets or timers that could start the service. No output means none were found; `grep` then returns a nonzero status, which is expected:

```sh title="Pi: look for related sockets and timers"
systemctl list-sockets --all | grep -i bluetooth
systemctl list-timers --all | grep -i bluetooth
```

If it is running and unused, stop it for this boot. Keep another recovery input or the known-good card available. To undo the trial, start the service again as shown below:

```sh title="Pi: temporary trial"
sudo systemctl stop bluetooth.service
```

Test the workload and recovery input devices. If something breaks, restore the prior running state:

```sh title="Pi: undo the temporary stop"
sudo systemctl start bluetooth.service
```

**Reference:** [systemctl inspection, enablement states, stop and start](https://manpages.debian.org/trixie/systemd/systemctl.1.en.html).

### Make the service change persistent

Disable automatic startup only after a successful trial and only if the recorded state was `enabled`. Review the unit's `Also=` setting first; if present, it is in the `[Install]` section of the `systemctl cat` output. The `disable` command can also change whether the units listed there start automatically. Record their states for recovery too.

:::tip[Optional save point]
Run this only if you set up [local save points](/kixetpi/guides/save-points/). Otherwise skip it: the command does not exist on a Pi without that setup, and this step works without it.

```sh title="Pi: optional save point before this change"
sudo savepoint create before-service-disable
```

To return to this point later, see [restoring a save point](/kixetpi/guides/save-points/#5-use-save-points-during-the-stages).
:::

Disable the reviewed service:

```sh title="Pi: keep the successful change across boots"
sudo systemctl disable bluetooth.service
```

Only if disabling succeeded, save other work and reboot with the known-good card available. This disconnects SSH:

```sh title="Pi: test the next boot"
sudo reboot
```

Reconnect and inspect its state and the workload again. Disabling automatic startup does not block every way a service can start. Dependencies or activation may still start it. Do not mask the unit to force the result. A mask blocks the unit from starting at all.

To restore Bluetooth if it was originally enabled and running, use the command below. Also restore any other recorded enablement changed by `Also=`:

```sh title="Pi: restore the recorded original state"
sudo systemctl enable --now bluetooth.service
```

**Reference:** [systemctl enable, disable, and mask](https://manpages.debian.org/trixie/systemd/systemctl.1.en.html) and [reboot](https://manpages.debian.org/trixie/systemd-sysv/reboot.8.en.html).

Do not disable Avahi casually. It may provide the `.local` hostname you use for SSH and service discovery. An IP-based login and a deliberate replacement for discovery would be prerequisites to removing it.

## 3. Review package removal without a bulk purge

APT can remove dependent packages too. Preserve a full-card backup and recorded installed versions before removal. Use `remove`, not `purge`, to retain package configuration files; neither operation backs up application data.

Review candidates and the automatic-removal proposal without applying it:

```sh title="Pi: inspect packages and simulate cleanup"
apt list --installed
sudo apt-get -s autoremove
```

**Reference:** [APT installed list](https://manpages.debian.org/trixie/apt/apt.8.en.html) and [apt-get simulation and autoremove](https://manpages.debian.org/trixie/apt/apt-get.8.en.html).

The `-s` option simulates the proposal without removing anything. Stopping a service and removing its package are separate decisions. Removing an inactive package may save disk space without changing RAM use.

For one known, unused package, replace `PACKAGE_NAME` in the following commands with its actual APT name:

```sh title="Pi: inspect one removal candidate"
apt-cache policy PACKAGE_NAME
apt-cache depends PACKAGE_NAME
apt-cache rdepends --installed PACKAGE_NAME
sudo apt-get -s remove PACKAGE_NAME
```

**Reference:** [apt-cache dependency, reverse-dependency and policy queries](https://manpages.debian.org/trixie/apt/apt-cache.8.en.html) and [apt-get simulation](https://manpages.debian.org/trixie/apt/apt-get.8.en.html).

Read the entire removal list. Stop if it includes boot, networking, SSH, security-update, hardware-support, or Raspberry Pi OS metapackages. A metapackage keeps a related set of packages installed. Stop if you do not understand a dependency.

:::tip[Optional save point]
Run this only if you set up [local save points](/kixetpi/guides/save-points/). Otherwise skip it: the command does not exist on a Pi without that setup, and this step works without it.

```sh title="Pi: optional save point before this change"
sudo savepoint create before-package-removal
```

To return to this point later, see [restoring a save point](/kixetpi/guides/save-points/#5-use-save-points-during-the-stages).
:::

Only after reviewing the simulation, remove the package. Keep the known-good card ready if boot or networking fails. Do not add `-y`, `purge`, or an unreviewed `autoremove`; compare the actual APT prompt against the simulation before accepting it:

```sh title="Pi: remove the reviewed package"
sudo apt-get remove PACKAGE_NAME
```

Package hooks can still change system state. The simulation is a snapshot, not a guarantee if package indexes or installed packages change before removal.

To undo the removal while the package remains in your configured repositories:

```sh title="Pi: reinstall the removed package"
sudo apt-get install PACKAGE_NAME
```

APT may install a newer version. Restore configuration and data from the backup as needed, then check the service's recorded enablement state. If the base no longer boots or networking fails, use the known-good card rather than attempting a broad reinstall over SSH.

A simple, explicitly requested installation may complete without a confirmation question. Review the simulation before invoking it, inspect the actual output, and answer a prompt only when one is present; do not add `-y` to make interaction predictable.

**Reference:** [apt-get remove, purge, and install](https://manpages.debian.org/trixie/apt/apt-get.8.en.html).

## 4. Decide whether logs survive a reboot

[DietPi RAMlog](https://dietpi.com/docs/software/log_system/#dietpi-ramlog) reduces disk writes. Its default mode does not save log files to disk. Its hourly-save mode risks losing up to an hour of logs on power failure.

Raspberry Pi OS Trixie already takes a similar approach for the systemd journal, the central log store. Its `raspberrypi-sys-mods` package ships a drop-in that sets `Storage=volatile`, so the journal is kept in RAM and **lost at every reboot**. This differs from plain Debian, which keeps a persistent journal on new installations. Confirm what your image does rather than assuming either default.

Inspect the effective configuration and current usage:

```sh title="Pi: inspect current logging"
systemd-analyze cat-config systemd/journald.conf
sudo journalctl --disk-usage
sudo journalctl --list-boots
```

**Reference:** [systemd-analyze cat-config](https://manpages.debian.org/trixie/systemd/systemd-analyze.1.en.html), [journalctl usage and boot list](https://manpages.debian.org/trixie/systemd/journalctl.1.en.html), and Raspberry Pi's [volatile journal drop-in](https://github.com/RPi-Distro/raspberrypi-sys-mods/blob/pios/trixie/usr/lib/systemd/journald.conf.d/40-rpi-volatile-storage.conf).

Look for `Storage=volatile` in the output, typically from `/usr/lib/systemd/journald.conf.d/40-rpi-volatile-storage.conf`. If `--list-boots` shows only the current boot, earlier boots' logs are already gone.

### Choose a logging mode

| Mode | Storage writes | After a crash or failed boot | Use it when |
| --- | --- | --- | --- |
| Stock volatile journal | None for the journal. | The previous boot's journal is gone. | The Pi is stable and SD-card wear matters more than logs from before a crash. |
| Bounded persistent journal (below) | Some, limited to the budget you set. | `journalctl -b -1` can show the previous boot. | You are testing changes, as in this guide, and need evidence across reboots. |

Either choice is valid. For this walkthrough, the stage checkpoints compare logs across reboots, so this guide proposes the bounded persistent journal during testing. You can remove it again once the system is stable. Do not put `/var/log` on a separate RAM disk, routinely truncate logs, or disable the journal.

### Optional: keep a bounded journal on disk

This example allows 64 MiB for persistent logs and 16 MiB for logs kept in RAM. These are project choices, not DietPi or Raspberry Pi defaults or tested limits for every card. A busy service may fill the budget before enough history accumulates.

If a persistent journal already exists, **export the logs you need outside the Pi first**. Enforcing a smaller limit can permanently delete archived history.

:::tip[Optional save point]
Run this only if you set up [local save points](/kixetpi/guides/save-points/). Otherwise skip it: the command does not exist on a Pi without that setup, and this step works without it.

```sh title="Pi: optional save point before this change"
sudo savepoint create before-journal
```

To return to this point later, see [restoring a save point](/kixetpi/guides/save-points/#5-use-save-points-during-the-stages).
:::

Create a new drop-in, a small configuration file read alongside the main file. Its `60-` prefix sorts after Raspberry Pi's `40-` file, so its `Storage` setting takes precedence. If its filename already exists, stop and review it rather than overwriting it.

```sh title="Pi: edit only this guide's journal drop-in"
sudo mkdir -p /etc/systemd/journald.conf.d
sudoedit /etc/systemd/journald.conf.d/60-kixetpi-limits.conf
```

```ini title="/etc/systemd/journald.conf.d/60-kixetpi-limits.conf"
[Journal]
Storage=persistent
SystemMaxUse=64M
RuntimeMaxUse=16M
```

`Storage=persistent` prefers disk storage under `/var/log/journal` and uses memory temporarily when disk storage is unavailable. `SystemMaxUse` limits persistent journal files, and `RuntimeMaxUse` limits journal files kept in RAM. Active files can keep usage above these limits. The settings do not limit other application logs.

**Reference:** [journald.conf drop-ins, precedence, storage and size limits](https://manpages.debian.org/trixie/systemd/journald.conf.5.en.html) and [sudoedit](https://manpages.debian.org/trixie/sudo/sudo.8.en.html).

Apply the change and inspect the result:

```sh title="Pi: apply and inspect logging"
sudo systemctl restart systemd-journald
sudo journalctl --flush
systemd-analyze cat-config systemd/journald.conf
sudo journalctl --disk-usage
sudo journalctl -u ssh --since today --no-pager
```

The `--flush` option transfers logs kept in RAM to persistent storage. If they have already been flushed during this boot, it does nothing.

**Reference:** [journald restart semantics](https://manpages.debian.org/trixie/systemd/systemd-journald.service.8.en.html), [journalctl --flush and filters](https://manpages.debian.org/trixie/systemd/journalctl.1.en.html), and [systemd-analyze cat-config](https://manpages.debian.org/trixie/systemd/systemd-analyze.1.en.html).

Verify in the `cat-config` output that no later drop-in overrides these settings. After the next reboot, `sudo journalctl -b -1` should show the prior boot if that history fits within the budget. On the first persistent boot there is no older journal yet. If prior-boot logs are missing after subsequent boots, investigate configuration, available storage, and whether the budget is too small before continuing.

Do not remove `rsyslog`, if installed, just because the journal exists. An application, log-rotation rule, or remote log collector may rely on it. These limits do not cap application log files outside the journal. Review their own rotation separately.

To return to the stock RAM-only journal, remove only this guide's drop-in:

```sh title="Pi: restore the previous journal configuration"
sudo rm /etc/systemd/journald.conf.d/60-kixetpi-limits.conf
sudo systemctl restart systemd-journald
```

**Reference:** [journald configuration precedence](https://manpages.debian.org/trixie/systemd/journald.conf.5.en.html) and [safe service restart](https://manpages.debian.org/trixie/systemd/systemd-journald.service.8.en.html).

Removing the drop-in does not delete journal files already written to `/var/log/journal`, and it cannot recover logs already rotated out. Remove those files only after exporting anything you need, and only if you no longer want them.

## 5. Keep the stock swap setup for now

Inspect the actual image instead of assuming a particular swap manager. Current Trixie Lite images use Raspberry Pi's `rpi-swap` package, which replaces the older `dphys-swapfile`. By default it creates *zram*, compressed swap space kept in RAM, and from time to time moves rarely used data from zram to a file at `/var/swap`. Only zram uses that file, so `swapon --show` normally lists `/dev/zram0` and not `/var/swap`.

Run `zramctl` only if installed; otherwise record that and skip that line:

```sh title="Pi: observe memory pressure under the real workload"
free -h
swapon --show
zramctl
vmstat 1 10
sudo journalctl -k -b --no-pager
```

**Reference:** [free](https://manpages.debian.org/trixie/procps/free.1.en.html), [swapon](https://manpages.debian.org/trixie/mount/swapon.8.en.html), [zramctl](https://manpages.debian.org/trixie/util-linux/zramctl.8.en.html), [vmstat](https://manpages.debian.org/trixie/procps/vmstat.8.en.html), and [journalctl kernel filter](https://manpages.debian.org/trixie/systemd/journalctl.1.en.html).

Then record the swap manager's configuration without changing it. Some of these paths may be absent on older images or other distributions; record that rather than creating them:

```sh title="Pi: inspect the rpi-swap configuration"
cat /etc/rpi/swap.conf
ls -l /etc/rpi/swap.conf.d/
systemctl list-timers rpi-zram-writeback.timer --no-pager
ls -l /var/swap
```

**Reference:** [rpi-swap `swap.conf(5)`](https://github.com/raspberrypi/rpi-swap/blob/dc2c7aa4465a66401ecbf9996b08aec3ab5a15ae/man/man5/swap.conf.5), also installed on the Pi as `man swap.conf`. It documents the default behavior and size limits, and drop-ins in `/etc/rpi/swap.conf.d/`.

Empty `zramctl` output can mean no zram devices exist. In `vmstat`, ignore the first row when comparing current activity; it summarizes time since boot. Look for sustained swap traffic, poor response times, or out-of-memory messages during the workload.

Zram compresses data in RAM at a CPU cost. It is not free memory, and it may not help much with incompressible data. Disk-backed swap uses storage and writes but can prevent an out-of-memory failure. A small Pi may need it more, not less.

Do not copy DietPi's swap scripts, run `swapoff -a`, force a swappiness value (the kernel setting for how readily it swaps), delete `/var/swap`, or install a second swap manager here. Leave the image's configuration intact for the first walkthrough. If pressure is a problem, first reduce the workload and skip the optional Nix layer. Record a separate experiment before proposing memory tuning.

## Checkpoint and recovery

Reboot, reconnect over SSH, and test the actual application, hardware, and name resolution. Repeat the baseline measurements and perform these read-only checks:

```sh title="Pi: verify the reduced system"
systemctl --failed
sudo ss -lntup
sudo journalctl -b -p warning --no-pager
sudo journalctl -b -1 --no-pager
```

The last command shows the previous boot only if you kept the optional persistent journal from step 4; with the stock RAM-only journal it reports no earlier boot.

**Reference:** [systemctl failed units](https://manpages.debian.org/trixie/systemd/systemctl.1.en.html) and [journalctl boot and priority filters](https://manpages.debian.org/trixie/systemd/journalctl.1.en.html).

To check repository access, refresh APT indexes separately:

```sh title="Pi: refresh repository indexes"
sudo apt update
```

This writes package-list metadata but does not install upgrades.

**Reference:** [APT update](https://manpages.debian.org/trixie/apt/apt.8.en.html).

Record each intentionally disabled unit, removed package, and changed file. Keep the results even if savings are negligible. Lite may already be close to the smallest useful setup for your workload.

| Symptom | First response |
| --- | --- |
| SSH works by IP but not `.local`. | Restore the discovery service if you changed it. Check the address and hostname. |
| A peripheral or application stopped working. | Restore the last stopped service, or reinstall the last removed package and its configuration. |
| The Pi becomes unresponsive under load. | Inspect memory and kernel logs. Restore the previous workload and swap configuration if you changed it outside this guide. |
| Previous-boot logs disappear. | Without the optional drop-in, this is the stock RAM-only journal. With it, check the effective configuration and storage space. Do not continue by disabling logging. |
| APT cannot resolve repositories. | Restore networking, DNS, or time services if changed. Never bypass signature or TLS checks. |

If checks pass, record the result and make a new full-card backup. Continue to [Kicksecure-inspired hardening](/kixetpi/guides/kicksecure/).

## Sources and review status

Reviewed on 22 November 2026 (previously 28 September 2026), including the `rpi-swap` behavior of current Trixie Lite images. The procedures above are an untested adaptation, not a DietPi-supported installation method.

- [DietPi installation and conversion warning](https://dietpi.com/docs/hardware/#make-your-own-distribution).
- [DietPi-Services](https://dietpi.com/docs/dietpi_tools/system_configuration/#dietpi-services).
- [DietPi logging modes](https://dietpi.com/docs/software/log_system/#dietpi-ramlog).
- [Debian Trixie systemctl manual](https://manpages.debian.org/trixie/systemd/systemctl.1.en.html) and [APT simulation and removal semantics](https://manpages.debian.org/trixie/apt/apt-get.8.en.html).
- [Debian Trixie journal configuration](https://manpages.debian.org/trixie/systemd/journald.conf.5.en.html). Consult `man journald.conf` for the version on your Pi.
- [Linux zram documentation](https://docs.kernel.org/admin-guide/blockdev/zram.html) and [virtual-memory controls](https://docs.kernel.org/admin-guide/sysctl/vm.html).

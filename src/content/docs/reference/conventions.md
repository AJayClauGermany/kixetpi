---
title: Conventions and command effects
description: How to read KixetPi's code blocks and placeholders, and which commands inspect or change the system.
---

Look up how a step is written, where a block runs, and what a command changes. This page does not replace the stage guides: always read the linked section, including its prerequisites and recovery limits, before running anything.

## How a step is laid out

Each numbered step in a stage guide follows the same order:

1. **Conditions and warnings** come first. Stop if your machine does not match them.
2. **The code block** has a title naming where it runs and what it does.
3. **Explanation** after the block says what the command changed and what output to expect.
4. A **Reference** line links the upstream manual or documentation for that exact command.
5. **Checks** say how to confirm the result before the next step.

Do not paste a whole page or section into a terminal. Run one logical step at a time and inspect each result.

## Where a block runs

The block title names the machine and session. Commands with no machine named in the title do not exist in these guides.

| Title starts with | Run it on |
| --- | --- |
| `Pi:` or `Pi user:` | The test Pi, as your ordinary administrator account, usually over SSH. |
| `Pi local console:` | A keyboard and display (or serial console) attached to the Pi. An SSH session is not a substitute. |
| `Pi original session:` / `Pi retained root shell:` | The specific session that the step tells you to keep open for recovery. |
| `Pi second normal-user session:` | A new, separate login, so the test does not reuse existing credentials. |
| `Administration computer:` | The computer you use to image the card and connect over SSH. |
| `VM guest:` / `Mac:` | Only in the [VM command test run](/kixetpi/reference/vm-test-run/). Never run a VM guest block in the Mac's shell. |
| A file path, such as `/etc/systemd/...` | File contents to create or edit, not commands. |

None of these commands are for the computer hosting this documentation site.

## Code block languages

| Language label | Meaning |
| --- | --- |
| `sh` | Shell commands, unless the title says "Add to" a file, which makes it file contents. |
| `ini`, `nix` | File contents for the path in the title. |
| `text` | File contents (such as SSH policy) or a notes template. Never shell input. |
| `yaml` | A Lima VM definition, used only in the VM test run. |

## Placeholders

Replace every placeholder with a value from your own machine. Stop if you cannot determine it; do not guess.

| Placeholder | Replace with |
| --- | --- |
| `YOUR_USER` | The account created in Raspberry Pi Imager. There is no default `pi` user. |
| `YOUR_PI` | The Pi's hostname or IP address. |
| `PACKAGE_NAME` | The exact APT package name under review. |
| `YOUR_APP.service` | The systemd unit for your own application. |
| `PATH` in `visudo -f PATH` | The sudoers file that grants the rule, not the shell's `$PATH`. |
| `ADMIN_IP`, `ADMIN_HOSTNAME` | The administration computer's address and name as seen by the Pi. |
| `~/.ssh/kixetpi_ed25519` | Your actual private key path, if you used an existing key. |

## Shell behavior to keep in mind

- **Line-ending `\`** continues one command onto the next line.
- **Double quotes** protect spaces but still expand `$VARIABLES`. **Single quotes** keep text literal, as in the `dpkg-query` format string. See [Bash quoting](https://manpages.debian.org/trixie/bash/bash.1.en.html#QUOTING).
- **Separate lines** are separate commands. The shell continues after a failure, so read each result before the next line matters.
- **Pipes** such as `sshd -T | grep ...` return the last command's status and can hide an earlier failure. See [Bash pipelines](https://manpages.debian.org/trixie/bash/bash.1.en.html#Pipelines).
- **Shell state**: `cd`, variables such as `NIX_VERSION`, and `sudo -i` last only for the current session. Stage 4's download and review blocks must run in the same session.
- **Nonzero exit status** is sometimes expected. `systemctl is-active` returns nonzero for an inactive unit, and a refused password login is the expected result of a test. The guides label these cases.
- **Interactive prompts** from `sudo`, `visudo`, `sudoedit`, APT, and SSH need a human. Do not add `-y`, `--force`, or passwordless sudo to avoid them.

## Command effects

This is a lookup table, not a sequence to execute. **Inspects** means the command is not intended to change configuration; it can still read sensitive details, prompt for a password, or write to logs.

| Commands | Effect | Changes state? | Read first |
| --- | --- | --- | --- |
| `free -h`, `df -h`, `swapon --show`, `zramctl`, `vmstat 1 10` | Resource use. Compare `available` RAM under equivalent loads. The first `vmstat` row summarizes since boot. Other `swapon` forms change swap. | Inspects | [Stage 2 §1](/kixetpi/guides/dietpi/#1-define-the-workload-and-measure), [free(1)](https://manpages.debian.org/trixie/procps/free.1.en.html), [vmstat(8)](https://manpages.debian.org/trixie/procps/vmstat.8.en.html) |
| `systemctl status`, `is-active`, `is-enabled`, `cat`, `list-*` | Activity, enablement, and unit contents. Enabled is not the same as running. | Inspects | [Stage 2 §2](/kixetpi/guides/dietpi/#2-trial-one-unused-service), [systemctl(1)](https://manpages.debian.org/trixie/systemd/systemctl.1.en.html) |
| `systemctl stop` / `start` | Runtime state for this boot only. | Yes, until reboot | [Stage 2 §2](/kixetpi/guides/dietpi/#2-trial-one-unused-service) |
| `systemctl disable` / `enable --now` | Startup links (and units named in `Also=`); `--now` also starts. `disable` does not block every activation path. | Yes, persistent | [Stage 2: persistence](/kixetpi/guides/dietpi/#make-the-service-change-persistent) |
| `systemctl reload`, `restart`, `daemon-reload` | Re-read service configuration, restart a process, or reload unit definitions. Not interchangeable. | Yes | [systemctl(1)](https://manpages.debian.org/trixie/systemd/systemctl.1.en.html) |
| `apt-cache policy`, `apt list`, `apt-mark showmanual`, `dpkg-query -W` | Package origins and inventory. | Inspects | [apt-cache(8)](https://manpages.debian.org/trixie/apt/apt-cache.8.en.html) |
| `apt-get -s ...` | Simulates a transaction without running package hooks. Can become stale. | Inspects | [apt-get(8)](https://manpages.debian.org/trixie/apt/apt-get.8.en.html) |
| `apt update` | Refreshes package metadata only. | Writes indexes | [Stage 1 §5](/kixetpi/guides/raspberry-pi-os/#5-confirm-the-release-and-update-normally) |
| `apt full-upgrade`, `apt-get remove`, `apt install` | Applies upgrades, removes, or installs packages. `full-upgrade` can remove packages but does not change the OS release. | Yes; backup-dependent | [Stage 1 §5](/kixetpi/guides/raspberry-pi-os/#5-confirm-the-release-and-update-normally), [Stage 2 §3](/kixetpi/guides/dietpi/#3-review-package-removal-without-a-bulk-purge) |
| `journalctl --disk-usage`, `--list-boots`, `-b`, `-u` | Reads the journal. | Inspects | [journalctl(1)](https://manpages.debian.org/trixie/systemd/journalctl.1.en.html) |
| `journalctl --flush`; journal drop-in | Moves runtime logs to disk; smaller limits can delete old logs permanently. | Yes; deleted logs are not recoverable | [Stage 2 §4](/kixetpi/guides/dietpi/#4-bound-logs-without-discarding-them-at-reboot) |
| `visudo -c`, `sshd -t`, `sshd -T [-C ...]` | Syntax and effective-policy checks. They do not prove that a login works. | Inspects | [Stage 3 §1](/kixetpi/guides/kicksecure/#optional-require-a-sudo-password), [Stage 3 §2](/kixetpi/guides/kicksecure/#2-verify-key-only-ssh-before-disabling-passwords) |
| `ssh -S none ...` | A fresh login that cannot reuse a shared connection. A timeout is not a refused password. | Inspects (adds `known_hosts` on first use) | [ssh(1)](https://manpages.debian.org/trixie/openssh-client/ssh.1.en.html) |
| `ufw status`, `show added`, `show raw`, `--dry-run enable` | Firewall inspection. A dry run is not a reachability test. | Inspects | [Stage 3 §3](/kixetpi/guides/kicksecure/#3-add-a-firewall-for-a-simple-headless-pi), [ufw(8)](https://manpages.debian.org/trixie/ufw/ufw.8.en.html) |
| `ufw default`, `ufw allow`, `ufw logging` | Stage rules; writes configuration even while inactive. | Yes | [Stage 3 §3](/kixetpi/guides/kicksecure/#3-add-a-firewall-for-a-simple-headless-pi) |
| `ufw enable` / `ufw disable` | Load or unload the firewall now and at boot. `disable` keeps saved rules; `reset` is not generic recovery. | Yes; can drop SSH | [Stage 3 §3](/kixetpi/guides/kicksecure/#3-add-a-firewall-for-a-simple-headless-pi) |
| `curl -o`, `sha256sum`, `tar -tJf` | Download a file, hash it, list an archive. | Writes the download only | [Stage 4 §2](/kixetpi/guides/nix/#2-review-and-install-upstream-nix) |
| `tar -xJf`, `./install --daemon` | Extract files; install Nix (accounts, services, shell profiles). | Yes; backup-dependent | [Stage 4 §2](/kixetpi/guides/nix/#2-review-and-install-upstream-nix) |
| `nix flake lock` / `update`, `nix build --dry-run`, `nix build` | Write the lock file; evaluate and possibly fetch; build into the store and a `result` link. | Yes (user files and store) | [Stage 4 §5](/kixetpi/guides/nix/#5-lock-build-and-activate-without-sudo) |
| `./result/activate`, `home-manager switch [--rollback]` | Activate a home environment; runs code as your user. | Yes | [Stage 4 §5–6](/kixetpi/guides/nix/#6-add-remove-update-and-roll-back) |
| `nix-collect-garbage` | Deletes unreachable store objects; with `-d`, also old generations and rollback paths. | Yes; not recoverable | [Stage 4: storage](/kixetpi/guides/nix/#storage-and-garbage-collection) |

For an option not listed here, use the reference after its code block or the installed manual (`man COMMAND`). If you cannot explain a command's target, effect, expected result, and recovery limit, do not run it yet.

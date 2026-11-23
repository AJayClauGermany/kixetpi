---
title: 3. Adapt Kicksecure's hardening practices
description: Harden access and reduce exposure on Raspberry Pi OS without adding Kicksecure repositories or claiming its full security model.
---

Keep the Raspberry Pi OS base from [stage 1](/kixetpi/guides/raspberry-pi-os/) and the reviewed reductions from [stage 2](/kixetpi/guides/dietpi/). This stage applies a small set of access controls, then checks which confinement mechanisms the actual Pi supports.

:::caution[Untested integration, local recovery required]
Use a test Pi with a known-good card backup and working local console access. SSH and firewall changes can lock you out. Keep your first SSH session open, but do not treat it as a substitute for a console. No hardening or recovery procedure here has passed a hardware test.
:::

## At a glance

- **Goal:** Key-only SSH, an optional sudo password, an optional inbound firewall, a recorded view of AppArmor, and a regular update routine.
- **Runs on:** The test Pi over SSH and at its **local console**, plus the administration computer for fresh login tests.
- **You need:** Stage 2's [checkpoint](/kixetpi/guides/dietpi/#checkpoint-and-recovery), a recent full-card backup, working console access, and your account password.
- **Ends with:** The [checkpoint](#checkpoint): reboot-tested access and workload, with applied and skipped controls recorded. Stopping here is a complete path.

## What changes and how to recover

| Action | Recovery limit |
| --- | --- |
| Require a sudo password | Restore the original rule from the retained root shell. A normal login alone cannot repair broken sudo. |
| Change SSH policy | Remove only the new drop-in, validate, then reload from working recovery access. |
| Enable UFW | Disable it at the local console. This leaves its saved rules and installed package in place. |
| Add service isolation | Remove only the trial drop-in, reload systemd, then restart the application. This does not restore application data. |

Stop after any failed check instead of making further changes. A drop-in is a small configuration file added beside the main configuration. You can remove it without changing the main file.

## This is not a Kicksecure conversion

Kicksecure's [Raspberry Pi](https://www.kicksecure.com/wiki/Raspberry_Pi) and [ARM64](https://www.kicksecure.com/wiki/ARM64) pages describe source builds and distro morphing as testers-only, without a downloadable image. Its [Debian conversion instructions](https://www.kicksecure.com/wiki/Debian) target Debian Trixie. Matching the Debian release does not establish Raspberry Pi OS compatibility.

Do not add Kicksecure repositories or install its metapackages, `security-misc`, replacement kernels, or boot-management packages on this base. Do not copy GRUB commands, x86-specific settings, or large sysctl lists. Those changes can conflict with Pi boot, networking, devices, or package management.

The practices we use here are granting only needed privileges, exposing fewer services, keeping software updated, and restricting what applications can access where possible. The procedures below use Raspberry Pi OS and Debian tools. Kicksecure does not support this adaptation as a Kicksecure installation. For the reasoning, and for what hardening here cannot achieve, see [Why adapt instead of convert](/kixetpi/explanation/adapt-not-convert/) and [Security, performance, and recovery limits](/kixetpi/explanation/limits/#what-hardening-does-not-do).

## 1. Check updates and administrative privileges

On the Pi, confirm the expected base and inspect its state:

```sh title="Pi: inspect the system before hardening"
cat /etc/os-release
dpkg --print-architecture
uname -r
apt-cache policy
systemctl --failed
sudo ss -lntup
sudo -l
```

Keep the image's Raspberry Pi and Debian or Raspbian package sources. Follow [stage 1's reviewed APT update and reboot steps](/kixetpi/guides/raspberry-pi-os/#5-confirm-the-release-and-update-normally), not `rpi-update`. Raspberry Pi recommends a fresh image for a major release change, not changing APT release names.

Review whether `sudo -l` grants `NOPASSWD: ALL`. If it does, code running as that user can normally obtain root without knowing a password. Even password-protected sudo is not a sandbox for malicious code in your own account.

Raspberry Pi OS images released since April 2026 require a sudo password by default, unless **Enable passwordless sudo** was checked in Imager. Installations created from older images keep passwordless sudo after updates. Grants usually come from one of these files, which you can list without changing anything:

```sh title="Pi: list sudo policy drop-ins"
sudo ls -l /etc/sudoers.d/
```

Look for `010_YOUR_USER-nopasswd`, `010_pi-nopasswd`, or `90-cloud-init-users`. Some older Imager versions also produced the cloud-init file with a passwordless rule.

**Reference:** [Raspberry Pi sudo password setting](https://github.com/raspberrypi/documentation/blob/master/documentation/asciidoc/computers/configuration/users.adoc) and [Lite release notes](https://downloads.raspberrypi.com/raspios_lite_arm64/release_notes.txt) (2026-04-13: "Passwordless sudo now disabled by default").

### Optional: require a sudo password

Skip this section if `sudo -l` already shows no `NOPASSWD` rule.

First confirm that you know your account's local password and can use it to log in at the console. Then open a root shell in the original session and **keep it open** until you have verified sudo in a separate normal-user session. If the sudo policy breaks, a normal login cannot give you root access to repair it; this shell can.

```sh title="Pi original session: retain recovery access"
sudo -i
id -u
```

Expect `0`, meaning this shell has root privileges. Keep it open for recovery until both checks below pass.

In the root shell, record the current policy so that you can restore it:

```sh title="Pi retained root shell: record the current sudo policy"
cat /etc/sudoers /etc/sudoers.d/*
```

Copy the output into your walkthrough record. A passwordless grant looks like `YOUR_USER ALL=(ALL) NOPASSWD: ALL`, sometimes written `NOPASSWD:ALL`. Then use **one** of these approaches, not both:

- **Simpler: `raspi-config`.** In the root shell, run `raspi-config` and choose **System Options** → **S10 Admin Password**. This is Raspberry Pi's supported switch. It deletes the three files named above outright, which is why you recorded them first.
- **Targeted: edit only the grant.** This leaves every other rule untouched:
  1. Run `visudo -f PATH`, replacing `PATH` with the file that contains the `NOPASSWD` grant. Use plain `visudo` if the grant is in `/etc/sudoers` itself.
  2. Change only `NOPASSWD` to `PASSWD` in that grant, for example to `YOUR_USER ALL=(ALL) PASSWD: ALL`. Do not remove administrative access or delete other lines.
  3. Save and exit. If `visudo` reports an error and asks what to do, press `e` to edit again or `x` to exit without saving. Never press `Q`, which saves the invalid file anyway.

With either approach, validate the whole policy:

```sh title="Pi retained root shell: check the whole sudo policy"
visudo -c
```

`visudo -c` checks syntax, ownership, and permissions, not which rule wins for a user. Stop and restore the original grant if it fails. In a *second, normal-user* session, invalidate its cached credentials before testing an actual privileged command:

```sh title="Pi second normal-user session: verify password and privilege"
sudo -k
sudo /usr/bin/id -u
```

Confirm that sudo prompts for your password and the command prints `0`. If the command succeeds without a prompt, another rule may still allow passwordless access. Inspect the other matching rules. If authentication or access fails, restore the original grant with `visudo` in the retained root shell. Only then leave the root shell with `exit`.

**Reference:** [Debian visudo(8)](https://manpages.debian.org/trixie/sudo/visudo.8.en.html), [sudoers(5) rule order and PASSWD tags](https://manpages.debian.org/trixie/sudo/sudoers.5.en.html),.

For a network-facing application, use its package's dedicated service account rather than your administrator account. This page does not define a safe environment for arbitrary hostile software.

## 2. Verify key-only SSH before disabling passwords

Use the key configured in Raspberry Pi Imager. If you initially used password authentication, follow the official [SSH key instructions](https://www.raspberrypi.com/documentation/computers/remote-access.html#configure-ssh-without-a-password) first. Never copy the private key to the Pi.

From a second terminal on your administration computer, replace the example username and hostname. Use the key path from stage 1, or the path to your existing key:

```sh title="Administration computer: prove public-key login works"
ssh -S none -i ~/.ssh/kixetpi_ed25519 -o PreferredAuthentications=publickey -o PasswordAuthentication=no -o KbdInteractiveAuthentication=no YOUR_USER@YOUR_PI
```

The `-S none` option disables connection sharing. Without it, SSH could reuse a connection that is already open, and you would not be testing a fresh login. Inside this new session, run `sudo -v`. Do not continue unless both login and administrative access work. A key passphrase prompt is local to the private key and is different from an SSH account-password prompt.

**Reference:** [Raspberry Pi SSH key setup](https://www.raspberrypi.com/documentation/computers/remote-access.html#configure-ssh-without-a-password) and [Debian ssh(1)](https://manpages.debian.org/trixie/openssh-client/ssh.1.en.html).

Before adding a policy file, check how the Pi reads its SSH server configuration. Settings come from `/etc/ssh/sshd_config` and from drop-in files in `/etc/ssh/sshd_config.d/`. Two rules decide which value applies:

- For each setting, the **first** value OpenSSH reads wins. Debian's main file includes the drop-ins at its start, so drop-ins override the main file. Drop-ins are read in filename order, which is why this guide's file is named `00-kixetpi.conf`: it sorts before files such as `50-cloud-init.conf`. A file whose name sorts earlier, or a setting placed above the `Include` line in an edited main file, can still win.
- `Match` blocks apply different settings to particular users or addresses.

Check all three conditions:

```sh title="Pi: check the SSH configuration layout"
sudo ls -l /etc/ssh/sshd_config.d/
sudo grep -n '^Include' /etc/ssh/sshd_config
sudo grep -rn '^[[:space:]]*Match' /etc/ssh/sshd_config /etc/ssh/sshd_config.d/
```

Create the file below only if `00-kixetpi.conf` is not listed yet, the `Include /etc/ssh/sshd_config.d/*.conf` line appears before any other setting in the main file, and the last command prints no `Match` lines (it then returns a nonzero status, which is expected). Otherwise stop and reconcile the configuration first.

Keep the existing SSH session and local console available. Recovery removes **only this new file**, then validates before reloading; see [Recover SSH access](#recover-ssh-access). Keep your account password for sudo and local recovery; do not lock the account with `passwd -l`.

```sh title="Pi: create a dedicated SSH policy file"
sudoedit /etc/ssh/sshd_config.d/00-kixetpi.conf
```

```text title="/etc/ssh/sshd_config.d/00-kixetpi.conf"
PubkeyAuthentication yes
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
```

These settings allow public-key login but refuse SSH passwords, keyboard-interactive authentication, and direct root login. Disabling SSH passwords does not lock the local account.

**Reference:** [Debian sshd_config(5) precedence and authentication directives](https://manpages.debian.org/trixie/openssh-server/sshd_config.5.en.html) and [sshd(8) account-lock behavior](https://manpages.debian.org/trixie/openssh-server/sshd.8.en.html).

Check syntax and effective settings before applying the change:

```sh title="Pi: validate SSH configuration"
sudo /usr/sbin/sshd -t
sudo /usr/sbin/sshd -T | grep -E '^(pubkeyauthentication|passwordauthentication|kbdinteractiveauthentication|permitrootlogin) '
```

Expect `pubkeyauthentication yes` and `no` for the other three settings. If the configuration has `Match` rules, also inspect `sshd -T -C` with the real connection details. Replace all values in this command. To find `ADMIN_IP`, run `echo $SSH_CLIENT` in your SSH session on the Pi; the first value is the administration computer's address. If you do not know a name for that computer, use the same address for `ADMIN_HOSTNAME`:

```sh title="Pi: inspect settings for your actual SSH connection"
sudo /usr/sbin/sshd -T -C user=YOUR_USER,addr=ADMIN_IP,host=ADMIN_HOSTNAME
```

Check the same four settings in the conditional output. **Do not reload** if either syntax or effective policy is wrong; correct the drop-in and recheck first.

**Reference:** [Debian sshd(8) test modes `-t`, `-T`, and `-C`](https://manpages.debian.org/trixie/openssh-server/sshd.8.en.html).

Only when both checks pass, reload without closing the recovery connection:

```sh title="Pi: reload SSH without closing the current session"
sudo systemctl reload ssh
systemctl status ssh --no-pager
```

**Reference:** [Debian systemctl(1) reload and status](https://manpages.debian.org/trixie/systemd/systemctl.1.en.html).

Repeat the exact key-only command above, including `-S none`, to open a new connection, and run `sudo -v` again. Also verify that password-only SSH is refused from your administration computer:

```sh title="Administration computer: expect permission denied"
ssh -S none -o PubkeyAuthentication=no -o PreferredAuthentications=password,keyboard-interactive YOUR_USER@YOUR_PI
```

If it still accepts an account password, the effective policy is not what this guide expects. Investigate includes and conditional rules before continuing.

**Reference:** [Debian ssh(1) authentication and connection-sharing options](https://manpages.debian.org/trixie/openssh-client/ssh.1.en.html).

### Recover SSH access

From the retained session or local console, remove only the new file and validate:

```sh title="Pi: undo this guide's SSH policy"
sudo rm /etc/ssh/sshd_config.d/00-kixetpi.conf
sudo /usr/sbin/sshd -t
```

**Only if validation succeeds**, run `sudo systemctl reload ssh` and test a fresh connection before closing recovery access. If you edited any existing configuration instead, restore that file from its pre-change copy. Do not delete other SSH drop-ins.

**Reference:** [Debian sshd(8) syntax validation](https://manpages.debian.org/trixie/openssh-server/sshd.8.en.html) and [systemctl(1) reload](https://manpages.debian.org/trixie/systemd/systemctl.1.en.html).

## 3. Add a firewall for a simple headless Pi

This example is only for a fresh Pi that does not route traffic and needs incoming connections only for SSH on TCP port 22. The policy is not for a router, access point, VPN gateway, container host, or public server. If your workload needs other inbound ports, document and allow them before enabling a firewall.

Use UFW from the existing APT repositories as a simpler interface than a hand-written nftables ruleset. This is a project choice, not a copy of Kicksecure's firewall.

First inspect listening ports and check whether a firewall manager is already in use. Firewall services may be absent or inactive on a fresh image. This can make `is-active` return nonzero. Continue the inspection rather than enabling those services:

```sh title="Pi: inspect before installing another firewall manager"
sudo ss -lntup
systemctl is-active nftables firewalld ufw
```

If `nft` is installed, also run `sudo nft list ruleset`. On Trixie, UFW and the `iptables` commands use nftables underneath, so this one listing also shows their rules. If the `iptables` package is installed, also run `sudo iptables-legacy-save` and `sudo ip6tables-legacy-save`; any line starting with `-A` is a rule from the older iptables system. An inactive service does not prove that no firewall rules exist. Do not proceed if you find a configured firewall, containers, a VPN, or rules you cannot explain. Do not flush or reset them to make the example fit.

With a working local console and a confirmed fresh configuration:

```sh title="Pi: install the firewall from the existing repositories"
sudo apt install ufw
sudo ufw status verbose
sudo ufw show added
```

Stop if UFW is already active or has existing rules. Inspect `/etc/default/ufw` and keep `IPV6=yes` so the policy covers IPv6 too. Do not disable IPv6 across the operating system as a shortcut.

**Reference:** [Debian apt(8)](https://manpages.debian.org/trixie/apt/apt.8.en.html) and [ufw(8) status, added rules, and IPv6](https://manpages.debian.org/trixie/ufw/ufw.8.en.html).

Stage the default policy and SSH exception while the firewall is still inactive:

```sh title="Pi: stage the policy before enabling it"
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw logging low
sudo ufw show added
sudo ufw --dry-run enable
```

The SSH exception permits any source that can reach the Pi, on IPv4 and IPv6. It is not a LAN-only rule. Keep router port-forwarding disabled and check the router's IPv6 exposure policy. Restricting SSH to a known management address or subnet is a useful later change, but it needs a stable address and separate lockout testing.

UFW also allows replies to connections the Pi started, and selected network functions: DHCP (automatic address assignment), ICMP (ping and network error messages), and local service discovery. "Deny incoming" does not mean every packet except SSH is rejected. Review `sudo ufw show raw` after activation for the complete rules; `ufw status` shows only part of the policy. Do not remove IPv6 neighbor discovery (how IPv6 devices find each other on the local network) or other default network rules blindly.

**Reference:** [Debian ufw(8) rules, dry-run, default exceptions, and reports](https://manpages.debian.org/trixie/ufw/ufw.8.en.html).

:::caution[Enabling UFW can drop SSH]
Use the local console, not a remotely pasted command sequence. Do not use `--force`. If a new SSH login fails, run `sudo ufw disable` **at the console**; this unloads UFW and disables it at boot while leaving the staged rules for inspection. A dry run cannot prove network reachability.
:::

Only with the SSH exception staged and recovery access ready, enable from the local console:

```sh title="Pi local console: enable and inspect"
sudo ufw enable
sudo ufw status verbose
sudo ufw show raw
```

**Reference:** [Debian ufw(8) remote-management warning, enable, status, and raw rules](https://manpages.debian.org/trixie/ufw/ufw.8.en.html).

From the administration computer, establish a new key-only SSH connection immediately, test the workload, and confirm that `sudo apt update` and name resolution still work. Check IPv4 and IPv6 access separately if both are used.

If access fails, return to the local console:

```sh title="Pi local console: disable the new firewall"
sudo ufw disable
```

This restores the pre-example inactive state but keeps the staged rules for inspection. Do not use `ufw reset` as generic recovery. Reboot only after the new policy works, then test access again. An incoming firewall with outgoing traffic allowed does not stop an allowed program from sending your data out.

**Reference:** [Debian ufw(8) disable versus reset](https://manpages.debian.org/trixie/ufw/ufw.8.en.html).

## 4. Check AppArmor rather than assume confinement

Kicksecure uses AppArmor, but installing the package does not reproduce Kicksecure's policies. The kernel must support AppArmor and have it enabled. The program also needs a loaded profile that enforces restrictions.

Inspect the Pi. The file may be absent if the kernel security filesystem is unavailable; record that result rather than assuming protection exists:

```sh title="Pi: discover kernel security modules"
cat /sys/kernel/security/lsm
```

This prints a comma-separated list of active Linux security modules (LSMs), the kernel features that enforce access rules, such as AppArmor. Raspberry Pi's 64-bit kernel configurations build AppArmor in but do not turn it on by default, so `apparmor` may well be missing unless the kernel command line (the boot parameters in `/boot/firmware/cmdline.txt`) enables it. That inference comes from the kernel sources, not a hardware test; record what your Pi actually reports.

**Reference:** [Linux security module list](https://docs.kernel.org/admin-guide/LSM/index.html), [AppArmor enablement](https://www.kernel.org/doc/html/latest/admin-guide/LSM/apparmor.html), and Raspberry Pi's [BCM2711](https://github.com/raspberrypi/linux/blob/rpi-6.18.y/arch/arm64/configs/bcm2711_defconfig) and [BCM2712](https://github.com/raspberrypi/linux/blob/rpi-6.18.y/arch/arm64/configs/bcm2712_defconfig) kernel configurations.

If AppArmor's tools are installed, also run:

```sh title="Pi: inspect loaded AppArmor policy"
sudo aa-status
```

**Reference:** [Debian aa-status(8) profiles and process modes](https://manpages.debian.org/trixie/apparmor/aa-status.8.en.html).

A missing file, missing command, or absent `apparmor` entry is a reason to investigate, not evidence that protection exists. An enabled module without a profile for your application does not confine that application. A profile in complain mode records events rather than enforcing its restrictions.

Record which applications have enforcing profiles. Do not install experimental Kicksecure profiles, change the Pi's boot parameters, or force every profile into enforce mode here. If AppArmor is unavailable, mark this check as unavailable and leave policy enablement for a separate kernel-specific experiment. The previous SSH and firewall steps do not depend on AppArmor, but they do not replace it either.

Nix store paths also differ from ordinary `/usr/bin` paths. Do not assume a profile for an APT-installed executable automatically covers a Nix-installed equivalent.

## 5. Trial isolation for a service you understand

Skip this section if you have not installed a custom application service. Do not experiment on SSH, networking, login, or Raspberry Pi hardware-management units.

For one nonessential service, replace `YOUR_APP.service` with its real unit name:

```sh title="Pi: inspect an application service"
systemctl cat YOUR_APP.service
systemd-analyze security YOUR_APP.service
```

Read the unit, especially its user, writable paths, and privilege requirements. The security score is a checklist, not an audit or proof of safety.

**Reference:** [Debian systemctl(1) unit inspection](https://manpages.debian.org/trixie/systemd/systemctl.1.en.html) and [systemd-analyze(1) security exposure estimate](https://manpages.debian.org/trixie/systemd/systemd-analyze.1.en.html).

Continue only if the application does not need privilege-gaining executables, temporary files shared with other services, or data it expects to keep in `/tmp` or `/var/tmp` across restarts. Create a dedicated drop-in **only if this filename is unused**.

If the service fails to restart after this change, remove only `60-kixetpi-hardening.conf`. Run `sudo systemctl daemon-reload`, then restart the service. Do not use `systemctl revert`, which also removes unrelated overrides.

```sh title="Pi: create an isolated trial drop-in"
sudo mkdir -p /etc/systemd/system/YOUR_APP.service.d
sudoedit /etc/systemd/system/YOUR_APP.service.d/60-kixetpi-hardening.conf
```

```ini title="60-kixetpi-hardening.conf"
[Service]
NoNewPrivileges=yes
PrivateTmp=yes
```

`NoNewPrivileges` prevents the service and the processes it starts from gaining privileges through mechanisms such as setuid programs (programs like `sudo` that run with their owner's privileges). A service already running as root keeps its existing privileges. The setting does not affect jobs the application starts through `at`, `cron`, or `systemd-run`. `PrivateTmp` gives the service private `/tmp` and `/var/tmp` directories, and **deletes their contents whenever the service stops**. Move any data the application keeps in those directories before trying it. Neither setting prevents all filesystem or network access.

**Reference:** [Debian systemd.exec(5) `NoNewPrivileges` and `PrivateTmp`](https://manpages.debian.org/trixie/systemd/systemd.exec.5.en.html) and [systemctl(1) drop-in/revert behavior](https://manpages.debian.org/trixie/systemd/systemctl.1.en.html).

```sh title="Pi: apply only to the selected application"
sudo systemctl daemon-reload
sudo systemctl restart YOUR_APP.service
systemctl status YOUR_APP.service --no-pager
sudo journalctl -u YOUR_APP.service --since today --no-pager
```

**Reference:** [Debian systemctl(1) daemon-reload and restart](https://manpages.debian.org/trixie/systemd/systemctl.1.en.html).

Test the application, including its writes, network requests, and restart behavior. If it fails, use the targeted recovery above. Keep more restrictive filesystem and network controls for an application-specific guide.

## 6. Keep an update routine

APT update timers and unattended security updates are not the same thing. This draft requires a deliberate update routine, such as a weekly review and prompt action on relevant security advisories. Use the base guide's update and reboot checks. Do not regard a completed initial install as permanently hardened.

If you already use `unattended-upgrades`, inspect its configuration and run `sudo unattended-upgrade --dry-run --debug`. Confirm which actual repository origins it allows. A Debian-only example may omit Raspberry Pi or Raspbian packages. Do not claim automatic coverage until its output shows the required origins and you have tested the process on this image.

**Reference:** [Debian unattended-upgrade(8) dry-run and configuration](https://manpages.debian.org/trixie/unattended-upgrades/unattended-upgrade.8.en.html).

Do not copy origin patterns from another release, enable unattended major-version upgrades, or schedule automatic reboots without a recovery plan. Optional Nix packages need their own reviewed updates; APT does not update them.

## Checkpoint

Before rebooting, verify a new key-only SSH login, working sudo access, firewall recovery from the console, and the real application. After rebooting, repeat the login and application tests, then record:

```sh title="Pi: collect the hardening checkpoint"
systemctl --failed
sudo ss -lntup
sudo journalctl -u ssh -b --no-pager
sudo journalctl -b -p warning --no-pager
sudo apt update
```

**Reference:** [Debian apt(8)](https://manpages.debian.org/trixie/apt/apt.8.en.html).

Only if you completed the UFW section:

```sh title="Pi: check the optional firewall"
sudo ufw status verbose
```

**Reference:** [Debian ufw(8) status](https://manpages.debian.org/trixie/ufw/ufw.8.en.html).

Explain why each remaining listening service is needed. Record which applications AppArmor confines and which it does not, including when AppArmor is unavailable. Make a new full-card backup of this working state before adding more software.

You can stop here and keep an APT-only system. If the hardware has enough resources and you want declarative user packages, continue to the [optional Nix guide](/kixetpi/guides/nix/).

## Sources and review status

Reviewed on 22 November 2026 (previously 28 September 2026), including Raspberry Pi's April 2026 change to password-required sudo. No claim here establishes Kicksecure equivalence or tested Pi support. If a local manual is missing, use the [Debian manual index](https://manpages.debian.org/trixie/index.html).

- [Kicksecure on Raspberry Pi](https://www.kicksecure.com/wiki/Raspberry_Pi), [ARM64 status](https://www.kicksecure.com/wiki/ARM64), and [Debian conversion](https://www.kicksecure.com/wiki/Debian).
- [Kicksecure security-misc](https://www.kicksecure.com/wiki/Security-misc) and [bootloader-related packages](https://www.kicksecure.com/wiki/Dev/boot#Bootloader-related_Kicksecure_and_Whonix_packages).
- [Raspberry Pi SSH access](https://www.raspberrypi.com/documentation/computers/remote-access.html#ssh) and [software updates](https://www.raspberrypi.com/documentation/computers/os.html#update-software).
- [Raspberry Pi documentation source for SSH](https://github.com/raspberrypi/documentation/blob/master/documentation/asciidoc/computers/remote-access/ssh.adoc) and [updates](https://github.com/raspberrypi/documentation/blob/master/documentation/asciidoc/computers/os/updating.adoc). The published pages returned HTTP 403 during this review.
- [Debian OpenSSH configuration](https://manpages.debian.org/trixie/openssh-server/sshd_config.5.en.html) and [configuration validation](https://manpages.debian.org/trixie/openssh-server/sshd.8.en.html).
- [Debian visudo validation and recovery precautions](https://manpages.debian.org/trixie/sudo/visudo.8.en.html) and [unattended-upgrade dry-run behavior](https://manpages.debian.org/trixie/unattended-upgrades/unattended-upgrade.8.en.html).
- [Debian UFW manual](https://manpages.debian.org/trixie/ufw/ufw.8.en.html), including remote-management warnings and default network allowances.
- [Linux AppArmor requirements](https://www.kernel.org/doc/html/latest/admin-guide/LSM/apparmor.html) and [Kicksecure AppArmor guidance](https://www.kicksecure.com/wiki/AppArmor).
- [Debian systemd execution controls](https://manpages.debian.org/trixie/systemd/systemd.exec.5.en.html), [security analysis](https://manpages.debian.org/trixie/systemd/systemd-analyze.1.en.html), and [targeted drop-in management](https://manpages.debian.org/trixie/systemd/systemctl.1.en.html).

---
title: Optional local save points
description: Keep restorable copies of the system files on the same card, so a bad change does not always mean re-flashing.
---

A save point is a copy of the Pi's system files kept on the same card. If a later change goes wrong, you put a save point back and reboot instead of re-flashing and repeating the setup. This page is optional: the four stages work without it.

:::caution[Untested, and not a backup]
The script below has not run on a Raspberry Pi. Save points live on the card they protect, so a failed, corrupted, or lost card takes them with it. Keep the known-good card and the full-card backup from [stage 1](/kixetpi/guides/raspberry-pi-os/#2-prepare-recovery-before-first-boot).
:::

## At a glance

- **Goal:** Take a named save point before each risky change, and prove once that restoring one works.
- **Runs on:** The test Pi over SSH, with the known-good card nearby.
- **You need:** Stage 1's [checkpoint](/kixetpi/guides/raspberry-pi-os/#checkpoint-and-troubleshooting), and more free space on the card than the system currently uses. No extra hardware.
- **Ends with:** The [checkpoint](#checkpoint): a `baseline` save point and one tested restore.

## What changes and how to recover

| Action | Recovery limit |
| --- | --- |
| Install the script | Delete `/usr/local/sbin/savepoint`. |
| Create a save point | Uses card space and adds writes. Delete the save point to free the space. |
| Restore a save point | Replaces system files, including package state and `/etc`. There is no undo unless you created another save point first. |
| Delete a save point | That restore option is gone. |

## How this compares with NixOS

NixOS keeps every system version it builds and lets you pick one from a menu at startup. Raspberry Pi OS Lite has no equivalent: its root filesystem cannot take snapshots, and the Pi's firmware has no boot menu. Save points borrow the idea in a simpler form.

| | NixOS generations | Save points here |
| --- | --- | --- |
| Created | Automatically on every rebuild | When you run `savepoint create` |
| Selected | From a menu at startup | By running `savepoint restore` and rebooting |
| If the system cannot boot | Pick an older entry in the menu | Restore from the [known-good card](#restore-when-the-pi-does-not-boot) |
| Covers | The whole system configuration | System files on the card, including packages, `/etc`, kernel, and boot files |
| Leaves alone | `/home` and application data | `/home`, `/nix`, and logs |

If you add Nix in [stage 4](/kixetpi/guides/nix/), Home Manager generations roll back your user packages. Save points cover the APT-managed system that Nix does not own.

## 1. Check space and rsync

```sh title="Pi: check free space and that rsync is installed"
df -h /
command -v rsync
```

The first save point is a full copy, so **Avail** must be larger than **Used**. Later save points store only files that changed, because unchanged files are shared between save points. If space is too tight, skip this page and rely on the known-good card.

Current Lite images include `rsync`. If `command -v rsync` prints nothing, install it with `sudo apt install rsync`.

**Reference:** [rsync manual](https://manpages.debian.org/trixie/rsync/rsync.1.en.html), in particular `--link-dest` and `--delete`.

## 2. Install the script

Read the script before installing it. It runs as root, and its `restore` command deletes files that the save point does not contain.

```sh title="Pi: create the script file"
sudo nano /usr/local/sbin/savepoint
```

Paste the following, save, and exit:

```sh title="/usr/local/sbin/savepoint"
#!/bin/sh
# savepoint: keep copies of the system files on the same card and put one back.
# KixetPi draft. Not tested on Raspberry Pi hardware.
set -eu

usage() {
  echo "Usage: savepoint [--target DIR] create NAME | list | restore NAME | delete NAME" >&2
  exit 2
}

die() {
  echo "savepoint: $*" >&2
  exit 1
}

# --target DIR works on a card mounted at DIR instead of the running system.
ROOT=
if [ "${1:-}" = "--target" ]; then
  [ $# -ge 2 ] || usage
  ROOT=${2%/}
  shift 2
fi

CMD=${1:-}
NAME=${2:-}
STORE=$ROOT/var/local/savepoints
BOOT=$ROOT/boot/firmware

# Never copied and never overwritten or deleted by a restore.
skipped() {
  cat <<'EOF'
/var/local/savepoints/
/home/*/
/nix/
/var/log/*
/var/swap
/var/tmp/*
/var/cache/apt/archives/*.deb
/lost+found/
/boot/firmware/*
/proc/*
/sys/*
/dev/*
/run/*
/tmp/*
/mnt/*
/media/*
EOF
}

check_name() {
  case $NAME in
    '' | .* | *[!A-Za-z0-9._-]*) die "use a name made of letters, digits, '.', '-' or '_'" ;;
  esac
}

check_boot() {
  [ -e "$BOOT/config.txt" ] || die "$BOOT has no config.txt; is the boot partition mounted?"
}

[ "$(id -u)" -eq 0 ] || die "run this with sudo"

case $CMD in
  create)
    check_name
    check_boot
    [ ! -e "$STORE/$NAME" ] || die "'$NAME' already exists"
    if [ -z "$ROOT" ] && pgrep -x 'apt|apt-get|dpkg' >/dev/null; then
      die "a package operation is running; wait for it to finish"
    fi

    # Hard-link unchanged files to the newest complete save point.
    prev=$(ls -1t "$STORE"/*/info 2>/dev/null | head -n 1)
    prev=${prev%/info}
    if [ -z "$prev" ]; then
      used=$(df -Pk "$ROOT/" | awk 'NR == 2 { print $3 }')
      free=$(df -Pk "$ROOT/" | awk 'NR == 2 { print $4 }')
      [ "$free" -gt "$used" ] || die "the first save point needs about $((used / 1024)) MB free; only $((free / 1024)) MB available"
    fi

    mkdir -p "$STORE"
    chmod 700 "$STORE"
    mkdir "$STORE/$NAME"
    rc=0
    skipped | rsync -aHAXx --numeric-ids --exclude-from=- \
      ${prev:+"--link-dest=$prev/root"} "$ROOT/" "$STORE/$NAME/root/" || rc=$?
    # 24 means files vanished while copying, which is normal on a running system.
    [ "$rc" -eq 0 ] || [ "$rc" -eq 24 ] || die "copy failed (rsync exit $rc); delete '$NAME' and retry"
    rsync -rt ${prev:+"--link-dest=$prev/boot"} "$BOOT/" "$STORE/$NAME/boot/"
    date '+%Y-%m-%d %H:%M' >"$STORE/$NAME/info"
    sync
    echo "Created save point '$NAME'."
    df -h "$ROOT/"
    ;;

  list)
    [ -d "$STORE" ] || die "no save points yet"
    for dir in $(ls -1tr "$STORE"); do
      if [ -f "$STORE/$dir/info" ]; then
        echo "$dir  $(cat "$STORE/$dir/info")"
      else
        echo "$dir  INCOMPLETE: delete it"
      fi
    done
    df -h "$ROOT/"
    ;;

  restore)
    check_name
    check_boot
    [ -f "$STORE/$NAME/info" ] || die "no complete save point named '$NAME'"
    echo "This replaces the system files under ${ROOT:-/} with save point '$NAME'."
    echo "Home directories, logs, and other save points are left alone."
    printf "Type the save point name to continue: "
    read -r answer
    [ "$answer" = "$NAME" ] || die "cancelled; nothing was changed"
    skipped | rsync -aHAXx --numeric-ids --delete --exclude-from=- \
      "$STORE/$NAME/root/" "$ROOT/"
    rsync -rtc --delete "$STORE/$NAME/boot/" "$BOOT/"
    sync
    echo "Restored save point '$NAME'. Reboot now."
    ;;

  delete)
    check_name
    [ -d "$STORE/$NAME" ] || die "no save point named '$NAME'"
    rm -rf -- "${STORE:?}/$NAME"
    echo "Deleted save point '$NAME'."
    ;;

  *)
    usage
    ;;
esac
```

```sh title="Pi: make it executable and check it"
sudo chmod 755 /usr/local/sbin/savepoint
sudo sh -n /usr/local/sbin/savepoint
sudo savepoint list
```

`sh -n` checks syntax without running anything; no output means the paste is intact. `savepoint list` should answer `no save points yet`.

What the script does:

- **Copies** everything on the root filesystem and the boot partition (`/boot/firmware`) into `/var/local/savepoints/NAME/`. Only root can read that directory.
- **Skips** the list under `skipped()`: your home directories, `/nix`, logs, the swap file, temporary files, and the save points themselves. A restore never overwrites or deletes anything on that list.
- **Refuses** to restore a save point that did not finish copying, and asks you to type the name before it changes anything.

## 3. Create the baseline

Take the first save point when the stage 1 checkpoint has passed and nothing else has changed. Stop your workload first if it writes data, and do not run this during a package operation.

```sh title="Pi: create the first save point"
sudo savepoint create baseline
sudo savepoint list
```

The first copy can take several minutes on a microSD card. Names may use letters, digits, `.`, `-`, and `_`. `list` shows each save point with its date, then the remaining space.

## 4. Test a restore once

Prove that restoring works before you depend on it. Keep your current SSH session open, and have the known-good card and local console ready.

```sh title="Pi: make a harmless change, then restore"
sudo touch /etc/savepoint-test
sudo savepoint restore baseline
sudo reboot
```

Type `baseline` when asked. Do not interrupt the restore; if it is interrupted, run it again before rebooting. After the reboot, check the result from a new SSH login:

```sh title="Pi: confirm the restore"
ls /etc/savepoint-test
systemctl --failed
sudo apt update
```

`ls` should report that the file does not exist. No units should have failed, and APT should still refresh without errors. Record the result in your [walkthrough record](/kixetpi/reference/walkthrough-record/).

## 5. Use save points during the stages

The later stages mark each step where a save point helps, in a box titled **Optional save point**, and give the command with a ready-made name. You do not have to choose names yourself:

| Stage | Before | Name used in the guide |
| --- | --- | --- |
| [2](/kixetpi/guides/dietpi/) | Disabling a service at startup | `before-service-disable` |
| [2](/kixetpi/guides/dietpi/) | Removing a package | `before-package-removal` |
| [2](/kixetpi/guides/dietpi/) | Keeping the journal on disk | `before-journal` |
| [3](/kixetpi/guides/kicksecure/) | Requiring a sudo password | `before-sudo-password` |
| [3](/kixetpi/guides/kicksecure/) | Changing SSH policy | `before-ssh-policy` |
| [3](/kixetpi/guides/kicksecure/) | Installing and enabling the firewall | `before-firewall` |
| [4](/kixetpi/guides/nix/) | Installing Nix | `before-nix` |

If you repeat a step, the name is already taken and the script stops without changing anything. Add a number, such as `before-package-removal-2`. For any other change, such as a large update, pick your own name:

```sh title="Pi: create a save point before a change"
sudo savepoint create SAVE_POINT_NAME
```

Try the stage's own undo first; a restore is for when that fails or the cause is unclear. To go back:

```sh title="Pi: restore a save point and reboot"
sudo savepoint list
sudo savepoint restore SAVE_POINT_NAME
sudo reboot
```

A restore returns package state to the save point's date, so review pending updates again afterward. Restoring `before-nix` leaves `/nix` on the card; follow [Remove Nix itself](/kixetpi/guides/nix/#remove-nix-itself) for the rest.

Delete save points you no longer need. Old ones hold outdated copies of programs and of `/etc`, and they use space:

```sh title="Pi: delete a save point"
sudo savepoint delete SAVE_POINT_NAME
```

## Restore when the Pi does not respond

Choose the first row that matches:

| Situation | What to do |
| --- | --- |
| SSH works | Restore as in [step 5](#5-use-save-points-during-the-stages). |
| SSH fails but the Pi boots | Log in at the local console and run the same restore there. |
| The Pi does not boot, and you have a USB card reader | Follow [the next section](#restore-when-the-pi-does-not-boot). |
| The Pi does not boot, and you have no card reader | Use the known-good card or re-flash, as in [stage 1](/kixetpi/guides/raspberry-pi-os/#checkpoint-and-troubleshooting). A Linux administration computer with `rsync` can also run the steps below; macOS and Windows cannot read the card's root filesystem without extra software. |

### Restore when the Pi does not boot

1. Shut down, swap in the known-good card, and boot it.
2. Put the failed card in a USB card reader and connect it to the Pi **after** it has booted.
3. Identify the failed card's two partitions. They normally appear as `/dev/sda1` (small, `vfat`) and `/dev/sda2` (large, `ext4`); the card you booted from is `mmcblk0`.

```sh title="Pi (known-good card): identify and mount the failed card"
lsblk -o NAME,SIZE,FSTYPE,MOUNTPOINTS
sudo mount /dev/sdX2 /mnt
sudo mount /dev/sdX1 /mnt/boot/firmware
```

Replace `sdX` with the device you identified. Stop if a mount fails: the filesystem may be damaged, and a restore cannot repair that.

```sh title="Pi (known-good card): restore onto the failed card"
sudo /mnt/usr/local/sbin/savepoint --target /mnt list
sudo /mnt/usr/local/sbin/savepoint --target /mnt restore SAVE_POINT_NAME
sudo umount /mnt/boot/firmware /mnt
```

`--target /mnt` makes the script work on the mounted card instead of the running system. Shut down, put the restored card back in the slot, and boot it.

### A USB drive instead of a second card

A USB flash drive is not required. On models that can boot from USB, one can stand in for the known-good card: flash it in Imager like a card. A Pi 4 or later tries the card slot first and then USB by default, so the drive boots only while the slot is empty. Older models vary; see [USB mass storage boot](https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#usb-mass-storage-boot). The Pi cannot offer a choice between the card and the drive at startup, so this adds a spare boot medium, not a boot menu.

## Limits

- **Same card.** Save points do not survive card failure, filesystem corruption, or a re-flash.
- **Not instant.** The copy runs while the system is live. Files that change during the copy, such as a database, may be saved in an inconsistent state.
- **Old secrets return.** A restore brings back the saved `/etc`, including account passwords and SSH server settings as they were. Your home directory, including `~/.ssh/authorized_keys`, is not touched in either direction.
- **Accounts and data can mismatch.** An account or service created after the save point disappears from `/etc`, but its files under `/home` or other skipped paths remain.
- **Bootloader firmware is outside the card.** On a Pi 4 or later, an EEPROM bootloader update is stored on the board and is not rolled back.
- **More card writes.** Each save point writes the changed files again.

[What recovery means](/kixetpi/explanation/limits/#what-recovery-means) explains where save points sit among the recovery levels.

## Checkpoint

- `sudo savepoint list` shows a complete `baseline`.
- The test restore removed `/etc/savepoint-test`, and the Pi rebooted with working SSH, sudo, and APT.
- You still have the known-good card or a restore-tested full-card backup.
- Your walkthrough record notes the save point names and the restore result.

Continue to [DietPi-inspired reduction](/kixetpi/guides/dietpi/).

## Sources and review status

Drafted on 23 November 2026. The script was exercised only against a scratch directory tree on a development machine (`dash`, rsync 3.2.7): create, list, restore, delete, an incomplete save point, and a mounted filesystem inside the tree. It has not run on Raspberry Pi OS or against a live root filesystem, and neither restore path is tested on hardware.

- [Debian Trixie rsync manual](https://manpages.debian.org/trixie/rsync/rsync.1.en.html). Trixie ships a newer rsync than the one used for the scratch test.
- `rsync` is in the Lite package list of [`pi-gen`](https://github.com/RPi-Distro/pi-gen/blob/master/stage2/01-sys-tweaks/00-packages), the tool that builds Raspberry Pi OS.
- [Raspberry Pi boot order (`BOOT_ORDER`)](https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#BOOT_ORDER) and [USB mass storage boot](https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#usb-mass-storage-boot).
- [Raspberry Pi `tryboot` and `autoboot.txt`](https://www.raspberrypi.com/documentation/computers/config_txt.html#autoboot-txt): the firmware's A/B boot switch, which this page does not use. It needs a second set of partitions and is a possible later extension.

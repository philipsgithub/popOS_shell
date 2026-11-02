#!/bin/sh
# Enable the extension, whether or not the running shell knows about it yet.
#
# `gnome-extensions enable` is a D-Bus client for the running gnome-shell, and the
# shell only scans the extension directories at startup. A freshly installed
# extension is therefore unknown to it, and on Wayland the shell cannot be
# restarted, so fall back to the dconf keys the shell reads on its next startup.

set -e

UUID="${UUID:-pop-shell@system76.com}"

SCHEMA=org.gnome.shell

if gnome-extensions enable "${UUID}" 2>/dev/null; then
    echo "Enabled ${UUID}"
    exit 0
fi

echo "The running shell does not know ${UUID} yet; enabling it for the next session"

# A stale entry here silently defeats the enable, so drop it first.
disabled=$(gsettings get ${SCHEMA} disabled-extensions)
case "${disabled}" in
*"'${UUID}'"*)
    # Match the UUID literally: it contains '.', which sed would treat as a wildcard.
    pattern=$(echo "${UUID}" | sed 's#[.[\*^$/\\]#\\&#g')
    gsettings set ${SCHEMA} disabled-extensions \
        "$(echo "${disabled}" \
            | sed -e "s#'${pattern}', ##" \
                  -e "s#, '${pattern}'##" \
                  -e "s#'${pattern}'##")"
    ;;
esac

enabled=$(gsettings get ${SCHEMA} enabled-extensions)
case "${enabled}" in
*"'${UUID}'"*)
    echo "${UUID} is already listed in enabled-extensions"
    ;;
"@as []" | "[]")
    gsettings set ${SCHEMA} enabled-extensions "['${UUID}']"
    ;;
*)
    gsettings set ${SCHEMA} enabled-extensions "${enabled%]}, '${UUID}']"
    ;;
esac

if test -n "${WAYLAND_DISPLAY}"; then
    echo "GNOME Shell cannot be restarted on Wayland."
    echo "Log out and back in to load ${UUID}."
fi

## General FF info
- [Releases](https://ftp.mozilla.org/pub/mozilla.org/firefox/releases/)


## Configuring Ubuntu box

- [Configuring Vagrant Box](https://github.com/fespinoza/checklist_and_guides/wiki/Creating-a-vagrant-base-box-for-ubuntu-12.04-32bit-server)
- [Removing password + Auto Login](http://askubuntu.com/questions/281074/can-i-set-my-user-account-to-have-no-password)


## Configuring Mac OS X box

- sshpass is required to run ansible against OS X [sshpass installation](http://thornelabs.net/2014/02/09/ansible-os-x-mavericks-you-must-install-the-sshpass-program.html)
- vagrant must be in sudoers [without password](http://wiki.summercode.com/sudo_without_a_password_in_mac_os_x)
- install xcode, brew


## Configuring Windows 7

- create vagrant user
- [configure WinRM and vagrant-windows](https://github.com/WinRb/vagrant-windows)
- [disable User Account Control UAC](http://windows.microsoft.com/en-us/windows/turn-user-account-control-on-off#1TC=windows-7)
- install python27 and pip (will use this for running mozmill)
- install cygwin with sshd, curl, wget, python etc
- [configure sshd@cygwin](http://www.howtogeek.com/howto/41560/how-to-get-ssh-command-line-access-to-windows-7-using-cygwin/)
- [configure ssh@cygwin](https://github.com/fespinoza/checklist_and_guides/wiki/Creating-a-vagrant-base-box-for-ubuntu-12.04-32bit-server)
- [open all tcp ports] to enable ssh (http://windows.microsoft.com/en-us/windows/open-port-windows-firewall#1TC=windows-7)
- add sshd user to administrtors [mmc](http://windows.microsoft.com/en-us/windows/add-user-account-to-group#1TC=windows-7)


### Cleanup

- [removing sshd](http://superuser.com/questions/110726/how-to-uninstall-reinstall-cygwin-to-use-the-sshd)

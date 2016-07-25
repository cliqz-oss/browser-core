## Configuring host

Requirements:

- Ansible
- Vagrant
- VMWare Fusion
- Vagrant VMWare Fusion Plugin
- Vagrant Windows Plugin

```shell
cd navigation-extension/tests

vagrant plugin install vagrant-windows
vagrant plugin install vagrant-vmware-fusion
vagrant plugin license vagrant-vmware-fusion deployment/vagrant-fusion-license.lic

pip install -r dev-dependencies
```

## Running and Provisioning boxes

IMPORTANT OSX box has some weird issues with networking.
I have found a workaround: comment out hostname and network during first run, then uncomment and reload.

IMPORTANT Windows bos gets weird 192.168.33.xxx ip
Update the ip in deployment/inventory.ini for Windows box

1. Comment-out node.vm.hostname and node.vm.network in vagrant file for osx
2. Start osx box `vagrant up osxmaverics --provider=vmware_fusion` and stop it `vagrant halt osxmaverics`
3. Comment-in node.vm.hostname and node.vm.network in vagrant file for osx
4. Start all boxes with `vagrant up --provider=vmware_fusion`
5. Provision boxes
6. Windows box might pop up security-related window on running python program. Allow python to work on all network types.
    - check that http://localhost is working
7. Add required mock-server ip to hosts file on Windows box manually:
    - 192.168.33.22 webbeta.cliqz.com
    - 192.168.33.22 logging.cliqz.com
    - 192.168.33.22 www.google.com

### Boxes provisioning

```shell
cd navigation-extension/tests/deployment

# Provision linux/osx boxes
ansible-playbook bootstrap.yaml -i inventory.ini -u vagrant --private-key ~/.vagrant.d/insecure_private_key -s -l nonwin

# Provision win box
ansible-playbook bootstrap.yaml -i inventory.ini -u vagrant --private-key ~/.vagrant.d/insecure_private_key -l win
```

## Running tests

Use `run-targets.py` to run mozmill tests on virtual boxes. It will read IP addresses and OS types from the inventory.ini and execute tests.

# Issues

## Ubuntu

- Disable screen saver


## Windows

- allow all connections for the python.exe in the firewall settings

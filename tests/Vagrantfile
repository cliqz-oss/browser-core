# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|

  config.vm.define :linffext01 do |node|
    node.vm.box = "ubuntu-12.04-desktop"
    node.vm.box_url = "https://s3.amazonaws.com/cliqz-vagrant-boxes/fusion/ubuntu-12.04-desktop.box"

    node.vm.hostname = :linffext01
    node.vm.network :private_network, ip: "192.168.33.22"

    node.vm.provider :vmware_fusion do |v|
      v.gui = true
      v.vmx["memsize"] = "2048"
      v.vmx["numvcpus"] = "1"
    end
  end

  config.vm.define :macffext01 do |node|
    node.vm.box = "osx-10.9-maverics"
    node.vm.box_url = "https://s3.amazonaws.com/cliqz-vagrant-boxes/fusion/osx-10.9-maverics.box"

    node.vm.hostname = :macffext01
    node.vm.network :private_network, ip: "192.168.33.33"

    node.vm.provider :vmware_fusion do |v|
      v.gui = true
      v.vmx["memsize"] = "2048"
      v.vmx["numvcpus"] = "1"
    end
  end

  config.vm.define :winffext01 do |node|
    node.vm.box = "win-7"
    node.vm.box_url = "https://s3.amazonaws.com/cliqz-vagrant-boxes/fusion/win-7.box"

    node.vm.guest = :windows
    node.vm.communicator = 'winrm'

    node.vm.hostname = :winffext01
    node.vm.network :private_network, ip: "192.168.33.44"
    node.vm.network :forwarded_port, guest: 3389, host: 3389
    
    node.vm.provider :vmware_fusion do |v|
      v.gui = true
      v.vmx["memsize"] = "2048"
      v.vmx["numvcpus"] = "1"
    end
  end
end

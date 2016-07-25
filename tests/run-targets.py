#!/usr/bin/env python
import paramiko
import yaml
import select
import requests
import socket
import os.path
import json
import re
import sys
import shlex
import ConfigParser

from termcolor import colored
from commandr import command, Run
from functools import partial
from itertools import chain
from operator import attrgetter
from multiprocessing import Pool

pred = lambda msg: sys.stdout.write(colored(msg, 'red') + '\n')
pgrey = lambda msg: sys.stdout.write(colored(msg, 'grey') + '\n')
pgreen = lambda msg: sys.stdout.write(colored(msg, 'green') + '\n')


class ssh_api(object):
    def __init__(self, os, ip, port=22, user='vagrant',
        key_path='~/.vagrant.d/insecure_private_key', version='', **kwargs):
        self.os = os
        self.ip = ip
        self.port = port
        self.user = user
        self.key_path = key_path
        self.version = version
        self.args = kwargs
        for key, value in kwargs.items():
            setattr(self, key, value)

    def ssh(self, cmd, connect_timeout=30):
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

        try:
            ssh.connect(self.ip, port=self.port,
                username=self.user, pkey=self.pk, timeout=connect_timeout)

            stdin, stdout, stderr = ssh.exec_command(cmd)
            output = ''.join(stdout.readlines())
            errput = ''.join(stderr.readlines())

            return output, errput
        finally:
            ssh.close()

    @property
    def pk(self):
        key_path = os.path.expanduser(self.key_path)
        key = paramiko.RSAKey.from_private_key(open(key_path))
        return key

    def ping(self):
        try:
            # http://stackoverflow.com/questions/17414518/openssh-on-cygwin
            # Windows cygwin issue: whoami is executed not in login shell
            out, err = self.ssh('bash -l -c whoami', connect_timeout=15)
            if out.strip() == 'vagrant':
                return True, None
            return False, err
        except socket.timeout, e:
            return False, e
        except socket.error, e:
            return False, e

    def __repr__(self):
        args = (self.__class__.__name__, self.os, self.ip, self.version)
        return '%s(%s, %s, version=%s)' % args

    @property
    def info(self):
        desc = '{0.ip:<14} {0.os}'.format(self)
        if self.version:
            desc += '({0.version})'.format(self)
        return desc

    def __call__(self, *args, **kwargs):
        return self.exec_test(*args, **kwargs)

class linux_api(ssh_api):

    @property
    def versions(self):
        if not hasattr(self, '_versions'):
            out, _ = self.ssh('ls -1 /opt/browsers/firefox')
            self._versions = out.strip().split('\n')
        return list(self._versions)

    def exec_test(self, version, manifest):
        cmd = ' '.join([
            'DISPLAY=:0',
            'mozmill',
            '-b /opt/browsers/firefox/{version}/firefox',
            '-m /vagrant/tests/mozmill/{manifest}.ini',
            '-a /vagrant/cliqz\\@cliqz.com',
            # '--screenshots-path=/tmp',
            # '--format=json'
        ])
        return self.ssh(cmd.format(**locals()))

class osx_api(ssh_api):

    @property
    def versions(self):
        if not hasattr(self, '_versions'):
            out, _ = self.ssh('ls -1 /opt/browsers/firefox')
            self._versions = re.findall('Firefox (.*).app', out)
        return list(self._versions)

    def exec_test(self, version, manifest):
        cmd = ' '.join([
            '/usr/local/bin/mozmill',
            '-b "/opt/browsers/firefox/Firefox {version}.app"',
            '-m "/vagrant/tests/mozmill/{manifest}.ini"',
            '-a "/vagrant/cliqz@cliqz.com"'
        ])
        return self.ssh(cmd.format(**locals()))


class win_api(ssh_api):

    @property
    def versions(self):
        if not hasattr(self, '_versions'):
            out, _ = self.ssh('ls -1 /cygdrive/c/browsers/firefox')
            self._versions = out.strip().split('\n')
        return list(self._versions)

    def exec_test(self, version, manifest):
        data = {
            'cmd': [
                'c:\\Python27\\Scripts\\mozmill.exe',
                '-b', 'c:\\browsers\\firefox\\{version}\\firefox.exe'.format(**locals()),
                '-m', 'c:\\vagrant\\tests\\mozmill\\{manifest}.ini'.format(**locals()),
                '-a', 'c:\\vagrant\\cliqz@cliqz.com',
                # '--format=json'
            ]
        }

        headers =  {
            'Content-type': 'application/json',
            'Accept': 'application/json'
        }

        res = requests.get('http://{}/exec'.format(self.ip),
            data=json.dumps(data), headers=headers)

        assert res.ok, 'Check Mozmill HTTP Server running on Win box'
        res = res.json()
        return (res['stdout'], res['stderr'])


def exec_tests(versions, test_nodes, test_ini, x_filter=None):

    pool = Pool(len(test_nodes))

    for version in versions:
        # Nodes supporting current browser version
        v_nodes = [n for n in test_nodes if version in n.versions]
        print '\nTesting version {} on {} nodes'.format(version, len(v_nodes))

        v_results = [pool.apply_async(n, (version, test_ini)) for n in v_nodes]

        for i, res in enumerate(v_results):
            stdout, stderr = res.get()
            node = v_nodes[i]
            is_error = 'ERROR' in stdout

            if is_error:
                pred('{n.ip} - ERROR'.format(n=node))
                print stdout
                # print stderr
            else:
                pgreen('{n.ip} - SUCCESS'.format(n=node))


            # res = 'ERROR' if 'ERROR' in stdout else 'OK'
            # print '[{node.ip}] - {res}'.format(node=node, res=res)
            # print stdout
            # print stderr

    pool.close()
    pool.join()


def get_nodes():

    # Get ansible inventory file path
    current_dir = os.path.dirname(__file__)
    inventory_file = os.path.join(
        current_dir, '..', 'tests', 'deployment', 'inventory.ini')
    inventory_file = os.path.abspath(inventory_file)

    # Read all available test nodes from ansible inventory
    cfg = ConfigParser.SafeConfigParser(allow_no_value=True)
    cfg.read(inventory_file)
    sections = {'linux', 'osx', 'win'}.intersection(cfg.sections())
    test_nodes = []

    # For each test node os-dependent test runner instance
    for section in sections:
        items = cfg.items(section)
        items = map(partial(filter, None), items)
        items = map('='.join, items)
        items = map(shlex.split, items)
        items = [(item[0], dict(kv.split('=') for kv in item[1:])) for item in items]

        api = globals()['{}_api'.format(section)]
        apis = map(lambda item: api(section, item[0], **item[1]), items)

        test_nodes.extend(apis)

    return test_nodes


def filter_nodes(nodes, x_filter):
    if not x_filter:
        return nodes

    # we filter by info (ip, version, os) and all custom args from inventory
    n_filter = lambda n: re.search(x_filter, n.info + str(n.args), re.I)
    filtered_nodes = filter(n_filter, nodes)
    if len(filtered_nodes) < len(nodes):
        pgrey('{} of {} nodes where selected with filter "{}"'.format(
            len(filtered_nodes), len(nodes), x_filter))
    return filtered_nodes


def get_versions(nodes):
    versions = chain.from_iterable(map(attrgetter('versions'), nodes))
    versions = filter(None, versions)
    versions = sorted(set(versions))
    return versions


def filter_versions(versions, x_filter):
    if not x_filter:
        return versions

    filtered_versions = filter(lambda v: re.search(x_filter, v, re.I), versions)
    pgrey('{} of {} versions where selected with filter "{}"'.format(
            len(filtered_versions), len(versions), x_filter))
    return filtered_versions


@command('all')
def run_all(test_ini='all-tests', node_filter=None, version_filter=None):
    nodes = get_nodes()
    nodes = filter_nodes(nodes, node_filter)

    versions = get_versions(nodes)
    versions = filter_versions(versions, version_filter)

    exec_tests(versions, nodes, test_ini)


@command('ping')
def run_ping(node_filter=None):
    test_nodes = get_nodes()
    test_nodes = filter_nodes(test_nodes, node_filter)
    for n in test_nodes:
        success, reason = n.ping()
        if success:
            pgreen('{n.info:<30} - OK'.format(n=n))
        else:
            pred('{n.info:<30} - {e}'.format(n=n, e=reason))


@command('versions')
def run_versions(node_filter=None):
    test_nodes = get_nodes()
    test_nodes = filter_nodes(test_nodes, node_filter)
    for node in test_nodes:
        pgreen('{n.info:<30} - Firefox versions: {versions}'.format(
            n=node, versions=', '.join(node.versions)))


if __name__ == '__main__':
    Run()

"""
    Manages packaging, deplyment and testing of the navigation extension.
"""

import urllib2
import xml.etree.ElementTree as ET
import os, os.path

from fabric.contrib import console
from fabric.api import task, local, lcd, hide
from fabric.utils import abort
from jinja2 import Environment, FileSystemLoader

import jsstrip

NAME = "Cliqz"
PATH_TO_EXTENSION = "cliqz@cliqz.com"
PATH_TO_EXTENSION_TEMP = "cliqz@cliqz.com_temp"
PATH_TO_S3_BUCKET = "s3://cdncliqz/update/"
PATH_TO_S3_BETA_BUCKET = "s3://cdncliqz/update/beta/"
XML_EM_NAMESPACE = "http://www.mozilla.org/2004/em-rdf#"
AUTO_INSTALLER_URL = "http://localhost:8888/"


def get_version(beta='True'):
    """Returns the extension's version string.

    The returned version will be constructed from the biggest version tag. If
    the beta argument is set to True the returned version will have a .1bN
    appended to the end, where N is the number of commits from last tag (e.g.
    0.4.08.1b123)."""

    full_version = local("git describe --tags", capture=True)  # e.g. 0.4.08-2-gb4f9f56
    # full_version = 'images'
    version_parts = full_version.split("-")
    version = version_parts[0]
    if beta == 'True':
        # If the number of commits after a tag is 0 the returned versions have
        # no dashes (e.g. 0.4.08)
        try:
            version = version + ".1b" + version_parts[1]
        except IndexError:
            version = version + ".1b0"
    return version


@task
def package(beta='True', version=None):
    """Package the extension as a .xpi file."""
    checkout = True # Checkout the tag if we are not doing a beta package
    if not (beta == 'True') and version is not None:
        print 'WARNING: This will not take the %s tag from git. It packages the '\
              'commit that HEAD is pointing to.\n'\
              'If you want to package a specific tag check it out first with:\n'\
              'git checkout <tag>\n'\
              'or for latest tag just omit the version argument.' % version
        checkout = False
    if version is None:
        version = get_version(beta)

    # Generate temporary manifest
    install_manifest_path = "cliqz@cliqz.com/install.rdf"
    env = Environment(loader=FileSystemLoader('templates'))
    template = env.get_template('install.rdf')
    output_from_parsed_template = template.render(name=NAME,
                                                  version=version,
                                                  beta=beta)
    with open(install_manifest_path, "wb") as f:
        f.write(output_from_parsed_template.encode("utf-8"))

    # Zip extension
    output_file_name = "%s.%s.xpi" % (NAME, version)
    local("cp -R %s %s" % (PATH_TO_EXTENSION, PATH_TO_EXTENSION_TEMP))

    #remove tests and bower components
    if not (beta == 'True'):
        local("rm -fr %s/tests" % (PATH_TO_EXTENSION_TEMP))
        local("rm -fr %s/bower_components" % (PATH_TO_EXTENSION_TEMP))
        local("rm -fr %s/bower.json" % (PATH_TO_EXTENSION_TEMP))

        #removes testing entries from the manifest
        local("sed -i '' '4,99d' %s/chrome.manifest" % (PATH_TO_EXTENSION_TEMP))

    with lcd(PATH_TO_EXTENSION_TEMP):  # We need to be inside the folder when using zip
        with hide('output'):
            exclude_files = "--exclude=*.DS_Store*"
            comment_cleaner(PATH_TO_EXTENSION_TEMP)
            local("zip  %s %s -r *" % (exclude_files, output_file_name))
            local("mv  %s .." % output_file_name)  # Move back to root folder
    local("rm -fr %s" % PATH_TO_EXTENSION_TEMP)

    return output_file_name


@task
def install_in_browser(beta='True', version=None):
    """Install the extension in firefox.

    Firefox needs the Extension Auto-Installer add-on.
    https://addons.mozilla.org/en-US/firefox/addon/autoinstaller/"""

    output_file_name = package(beta, version)
    data = open(output_file_name).read()
    try:
        response = urllib2.urlopen(AUTO_INSTALLER_URL, data)
    except urllib2.HTTPError as exception:
        if exception.code == 500:
            pass  # Success (Extension Auto-Installer returns 500)
    except urllib2.URLError as exception:
        abort("Extension Auto-Installer not running :(")


@task
def publish(beta='True', version=None):
    """Upload extension to s3 (credentials in ~/.s3cfg need to be set to primary)"""
    if not (beta == 'True') and version is not None:
        abort("You should never publish a non-beta package with a fixed version.\n"\
              "Always use git tags (and push them to upstream) so we can keep "\
              "track of all live versions.")

    if beta == 'True':
        if not console.confirm('You are going to update the extension '\
                               'for BETA users. Do you want to continue?'):
            return
    else:
        if not console.confirm('You are going to update the extension '\
                               'for ALL users. Do you want to continue?'):
            return

    update_manifest_file_name = "latest.rdf"
    latest_html_file_name = "latest.html"
    icon_name = "icon.png"
    output_file_name = package(beta, version)
    icon_url = "http://cdn2.cliqz.com/update/%s" % icon_name
    path_to_s3 = PATH_TO_S3_BETA_BUCKET if beta == 'True' else PATH_TO_S3_BUCKET
    local("s3cmd --acl-public put %s %s" % (output_file_name, path_to_s3))

    env = Environment(loader=FileSystemLoader('templates'))
    manifest_template = env.get_template(update_manifest_file_name)
    if version is None:
        version = get_version(beta)
    if beta == 'True':
        download_link = "https://s3.amazonaws.com/cdncliqz/update/beta/%s" % output_file_name
        download_link_latest_html = "http://cdn2.cliqz.com/update/beta/%s" % output_file_name
    else:
        download_link = "https://s3.amazonaws.com/cdncliqz/update/%s" % output_file_name
        download_link_latest_html = "http://cdn2.cliqz.com/update/%s" % output_file_name
    output_from_parsed_template = manifest_template.render(version=version,
                                                           download_link=download_link)
    with open(update_manifest_file_name, "wb") as f:
        f.write(output_from_parsed_template.encode("utf-8"))
    local("s3cmd -m 'text/rdf' --acl-public put %s %s" % (update_manifest_file_name,
                                                          path_to_s3))
    local("rm  %s" % update_manifest_file_name)

    # Provide a link to the latest stable version
    latest_template = env.get_template(latest_html_file_name)
    output_from_parsed_template = latest_template.render(download_link=download_link_latest_html,
                                                         icon_url=icon_url)
    with open(latest_html_file_name, "wb") as f:
        f.write(output_from_parsed_template.encode("utf-8"))
    local("s3cmd --acl-public put %s %s" % (latest_html_file_name,
                                            path_to_s3))
    local("rm  %s" % latest_html_file_name)


@task
def test():
    """Run mozmill tests from tests folder."""
    firefox_binary_path = "/Applications/Firefox.app/Contents/MacOS/firefox"
    tests_folder = 'tests/mozmill/'
    output_file_name = package()
    local("mozmill --test=%s --addon=%s --binary=%s" % (tests_folder, output_file_name,
                                                        firefox_binary_path))


@task
def unit_test():
    """Run mozmill tests from unit test folder."""
    firefox_binary_path = "/Applications/Firefox.app/Contents/MacOS/firefox"
    tests_folder = 'tests/mozmill/unit/'
    output_file_name = package()
    local("mozmill --test=%s --addon=%s --binary=%s" % (tests_folder, output_file_name,
                                                        firefox_binary_path))


@task
def clean():
    """Clean directory from .xpi files"""
    local("rm  *.xpi")


@task
def comment_cleaner(path=PATH_TO_EXTENSION):
    target = ['js', 'jsm', 'html']
    ignore = ['handlebars-v1.3.0.js', 'ToolbarButtonManager.jsm', 'math.min.jsm', 'CliqzAntiPhishing.jsm']

    print 'CommentCleaner - Start'
    ext_root = os.path.dirname(os.path.realpath(__file__)) + '/' + path
    for root, dirs, files in os.walk(ext_root):
        for f in files:
            if f.split('.')[-1] in target and f not in ignore:
                print 'X',
                with open(root + '/' + f, 'r+') as handler:
                    content = handler.read()
                    handler.seek(0)
                    handler.truncate()
                    handler.write(js_comment_removal(content))
            else:
                print '.',
    print
    print 'CommentCleaner - Done'


def js_comment_removal(s):
    return jsstrip.strip(s, False, False, True, True)

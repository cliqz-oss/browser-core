#!/usr/bin/env python

# WARNING: not tested under Windows

import argparse
import os
import sys
from boto.s3.connection import S3Connection
from fnmatch import fnmatch

# 5 minutes
cache_control_default = 'max-age=300'
cache_control_exceptions = {
    # 1 year
    'js/*': 'max-age=31536000',
    'skin/*': 'max-age=31536000',
    # 1 day
    'locale/*': 'max-age=86400',
    'static/*': 'max-age=86400',
    # 1 hour
    'templates/*': 'max-age=3600',
}
exclude_files = ['.DS_Store', '*.map']


def upload_dir(dir):
    for root, _, files in os.walk(dir):
        for file in files:
            if any([fnmatch(file, pattern) for pattern in exclude_files]):
                print 'excluding %s' % file
                continue

            relpath = os.path.relpath(root, dir)
            abspath = os.path.abspath(os.path.join(root, file))

            if os.curdir != relpath:
                relpath = os.path.join(relpath, file)
            else:
                relpath = file

            upload_file(abspath, relpath)


def upload_file(file, keyname):
    key = bucket.new_key(prefix + '/' + keyname)
    cache_control = cache_control_default
    for pattern in cache_control_exceptions:
        if fnmatch(keyname, pattern):
            cache_control = cache_control_exceptions[pattern]
    key.set_metadata('Cache-Control', cache_control)
    key.set_contents_from_filename(file)
    print file, keyname, cache_control


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Deployer for mobile')
    parser.add_argument('-b', '--build-dir',
                        dest='build_dir', help='directory containing build',
                        required=True)
    parser.add_argument('-k', '--key-prefix',
                        dest='key_prefix', help='S3 key prefix',
                        required=True)
    parser.add_argument('--bucket',
                        dest='bucket', help='S3 bucket',
                        default='cdn.cliqz.com')

    args = parser.parse_args()

    conn = S3Connection()
    bucket = conn.get_bucket(args.bucket)
    prefix = args.key_prefix

    if not os.path.isdir(args.build_dir):
        print '%s is not a directory' % args.build_dir
        sys.exit(1)

    upload_dir(args.build_dir)

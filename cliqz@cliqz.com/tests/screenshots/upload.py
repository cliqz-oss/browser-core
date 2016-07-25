#!/usr/bin/env python
import datetime
import glob
import math
import os
import shutil
import sys

from boto.s3.connection import S3Connection
from optparse import OptionParser
from PIL import Image

conn = S3Connection()


def main(argv):
    usage = "extracts dropdown from screenshots and " +\
            "creates mosaics of dropdowns\n" +\
            "\t%prog [options]"
    parser = OptionParser(usage=usage)

    parser.add_option("-i", metavar="INPUT_FOLDER",
                      action="store", dest="input_folder",
                      help="look for screenshots in <INPUT_FOLDER> "
                           "[default: '%default']", default=".")
    parser.add_option("-o", metavar="OUTPUT_FOLDER",
                      action="store", dest="output_folder",
                      help="save cropped screenshots and mosaics "
                           "in <OUTPUT_FOLDER> [default: '%default']",
                      default=".")
    parser.add_option("-f", metavar="INPUT_FILE_PATTERN",
                      action="store", dest="input_file_pattern",
                      help="name pattern of screenshot files "
                           "[default: '%default']",
                      default="dropdown*.png")
    parser.add_option("--dry-run",
                      action="store_true", dest="dry_run",
                      help="do not upload to S3")
    parser.add_option("--keep-files",
                      action="store_true", dest="keep_files",
                      help="do not delete local screenshots and mosaics")
    parser.add_option("--bucket", metavar="OUTPUT_BUCKET",
                      action="store", dest="output_bucket",
                      help="upload cropped screenshots and mosaics "
                           "to S3 bucket <OUTPUT_BUCKET> "
                           "[default: '%default']",
                      default="tests-dropdown-appearance")
    parser.add_option("--dropdown-width", metavar="DROPDOWN_WIDTH",
                      action="store", dest="dropdown_width",
                      help="width of dropdown "
                           "[default: '%default']", type=int,
                      default=910)
    parser.add_option("--dropdown-height", metavar="DROPDOWN_HEIGHT",
                      action="store", dest="dropdown_height",
                      help="height of dropdown "
                           "[default: '%default']", type=int,
                      default=375)
    parser.add_option("--dropdown-left", metavar="DROPDOWN_LEFT",
                      action="store", dest="dropdown_left",
                      help="horizontal position of dropdown "
                           "[default: '%default']", type=int,
                      default=32)
    parser.add_option("--dropdown-top", metavar="DROPDOWN_TOP",
                      action="store", dest="dropdown_top",
                      help="vertical position of dropdown "
                           "[default: '%default']", type=int,
                      default=47)
    parser.add_option("--folder-individual", metavar="FOLDER_INDIVIDUAL",
                      action="store", dest="folder_individual",
                      help="save individual dropdown screenshots in "
                           "sub-folder <FOLDER_INDIVIDUAL> "
                           "[default: '%default']",
                      default="individual")
    parser.add_option("--folder-mosaic", metavar="FOLDER_MOSAIC",
                      action="store", dest="folder_mosaic",
                      help="save generated mosaics in "
                           "sub-folder <FOLDER_MOSAIC> "
                           "[default: '%default']",
                      default="mosaic")
    parser.add_option("--mosaic-cols", metavar="MOSAIC_COLS",
                      action="store", dest="mosaic_cols",
                      help="number of tiles per row "
                           "[default: '%default']", type=int,
                      default=4)
    parser.add_option("--mosaic-padding", metavar="MOSAIC_PADDING",
                      action="store", dest="mosaic_padding",
                      help="padding between mosaic tiles "
                           "[default: '%default']", type=int,
                      default=10)
    parser.add_option("--mosaic-tiles", metavar="MOSAIC_TILES",
                      action="store", dest="mosaic_tiles",
                      help="max. numnber of tiles in a mosaic "
                           "[default: '%default']", type=int,
                      default=16)
    parser.add_option("--mosaic-tile-width", metavar="MOSAIC_TILE_WIDTH",
                      action="store", dest="mosaic_tile_width",
                      help="width of a mosaic tile; -1 for no resize "
                           "[default: '%default']", type=int,
                      default=-1)
    parser.add_option("--timestamp", metavar="MOSAIC_TILE_WIDTH",
                      action="store", dest="timestamp",
                      help="timestamp used for naming folder; "
                           "using current time if not set"
                           "[default: '%default']",
                      default="")

    (options, args) = parser.parse_args()

    timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")\
        if len(options.timestamp) == 0 else options.timestamp
    output_folder_base = \
        os.path.join(timestamp,
                     "width-" + str(options.dropdown_width))
    output_folder = \
        os.path.join(options.output_folder, output_folder_base)
    output_folder_individual = \
        os.path.join(output_folder, options.folder_individual)
    output_folder_mosaic = \
        os.path.join(output_folder, options.folder_mosaic)

    sys.stderr.write("creating folder '%s'\n" % output_folder_individual)
    os.makedirs(output_folder_individual)
    sys.stderr.write("creating folder '%s'\n" % output_folder_mosaic)
    os.makedirs(output_folder_mosaic)

    input_file_pattern = \
        os.path.join(options.input_folder, options.input_file_pattern)
    sys.stderr.write("looking for screenshots in '%s'\n" % input_file_pattern)

    if options.mosaic_tile_width > 0:
        mosaic_tile_height =\
            int(options.mosaic_tile_width *
                (options.dropdown_height / float(options.dropdown_width)))
        sys.stderr.write("resizing mosaic tiles to %d x %d\n" %
                         (options.mosaic_tile_width, mosaic_tile_height))
    else:
        sys.stderr.write("not resizing mosaic tiles\n")

    mosaic_images = []
    for in_filename in glob.glob(input_file_pattern):
        sys.stderr.write("loading '%s'\n" % in_filename)
        dropdown_image = Image.open(in_filename).crop((
            options.dropdown_left, options.dropdown_top,
            options.dropdown_left + options.dropdown_width,
            options.dropdown_top + options.dropdown_height
        ))

        out_filename = \
            os.path.join(output_folder_individual,
                         os.path.basename(in_filename))
        sys.stderr.write("saving to '%s'\n" % out_filename)
        dropdown_image.save(out_filename)

        if options.mosaic_tile_width > 0:
            dropdown_image = dropdown_image.resize(
                (options.mosaic_tile_width, mosaic_tile_height),
                Image.ANTIALIAS)
        mosaic_images.append(dropdown_image)

    n = 0
    for i in range(0, len(mosaic_images), options.mosaic_tiles):
        mosaic = make_mosaic(mosaic_images[i:min(i + options.mosaic_tiles,
                                           len(mosaic_images))],
                             options.mosaic_cols, options.mosaic_padding)
        mosaic_filename = os.path.join(output_folder_mosaic,
                                       "mosaic-" + ("%03d" % n) + ".png")
        sys.stderr.write("saving mosaic to '%s'\n" % mosaic_filename)
        mosaic.save(mosaic_filename)
        n += 1

    sys.stderr.write("uploading all files to 's3://%s/%s'\n" %
                     (options.output_bucket, output_folder_base))
    upload_folder(output_folder,
                  options.output_bucket,
                  output_folder_base,
                  options.dry_run)

    if not options.keep_files:
        sys.stderr.write("deleting folder '%s'\n" % output_folder)
        shutil.rmtree(output_folder)
        parent_folder = \
            os.path.join(options.output_folder, timestamp)
        if os.listdir(parent_folder) == []:
            sys.stderr.write("deleting empty parent folder '%s'\n" %
                             parent_folder)
            shutil.rmtree(parent_folder)

    sys.stdout.write("%s\n" % timestamp)


def make_mosaic(images, cols, padding=0):
    rows = int(math.ceil(len(images) / float(cols)))
    w, h = images[0].size
    out = Image.new("RGB",
                    (w * cols + padding * (cols + 1),
                     h * rows + padding * (rows + 1)))
    c = 0
    r = 0
    for image in images:
        out.paste(image,
                  (c * w + (c + 1) * padding,
                   r * h + (r + 1) * padding))
        c += 1
        if c == cols:
            c = 0
            r += 1

    return out


def upload_folder(input_folder, bucket, key_prefix, is_dryrun=False):
    key_prefix = key_prefix.replace("\\", "/")
    for root, dirs, files in os.walk(input_folder, topdown=False):
        for name in files:
            filename = os.path.join(root, name)
            key = "/".join([key_prefix, root[len(input_folder) + 1:], name])
            upload(filename, bucket, key, is_dryrun)


def upload(filename, bucket, key, is_dryrun=False):
    sys.stderr.write("uploading '%s' to 's3://%s/%s'\n" %
                     (filename, bucket, key))
    if is_dryrun:
        sys.stderr.write("skipped (dry run)\n")
    else:
        bucket = conn.get_bucket(bucket)
        key = bucket.new_key(key)
        key.set_contents_from_filename(filename)


if __name__ == '__main__':
    main(sys.argv)

# from PIL import ImageDraw
# from PIL import ImageFont
# font = ImageFont.truetype("arial.ttf", 14)
# draw = ImageDraw.Draw(out)
# draw.text((20, 20), "test", (255, 0, 0), font = font)

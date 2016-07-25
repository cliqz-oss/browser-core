#!/usr/bin/env python

import sys
import json
import sqlite3 as lite


def get_history(query, path_to_db):
    history = []
    con = lite.connect(path_to_db)
    with con:
        cur = con.cursor()

        cur.execute('SELECT url, title FROM moz_places '
                    'WHERE url LIKE "%%%s%%";' % query)

    rows = cur.fetchall()

    for r in rows:
        temp = {
            'url': r[0],
            'title': r[1]
        }

        history.append(temp)
    return history


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print "Usage: get_history.py <query> <path_to_firefox_db>"
        print " - on macos database is located at:"
        print " ~/Library/Application Support/Firefox/Profiles/<PROFILE>/places.sqlite"
        sys.exit(1)

    query = sys.argv[1]
    path_to_db = sys.argv[2]

    history = get_history(query, path_to_db)

    for h in history:
        print json.dumps(h)

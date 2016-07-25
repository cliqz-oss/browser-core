#!/usr/bin/env python

'''
cluster.py
Used to test how brand definition rules will cluster user's history.
'''


import sys
import json
import yaml
import urlparse
import re
from optparse import OptionParser


def read_history(filename):
    if not filename:
        fd = sys.stdin
    else:
        fd = open(filename)

    history = []
    for line in fd:
        temp = json.loads(line)
        history.append(temp)
    return history


def read_brands(filename):
    brands = {'brands': {}}
    with open(filename, 'r') as f:
        brands = yaml.load(f)
    return brands['brands']


def match_domains(domains, history):
    matching = []
    for h in history:
        url = h.get("url")
        url_parts = urlparse.urlparse(url)

        matched = False
        for d in domains:

            if re.search(d, url_parts.netloc):
                matched = True
                break
        if matched:
            matching.append(h)
        else:
            print "@@@ no match: %s" % url_parts.netloc
    return matching


def rewrite_url(entry, url_rule):

    if not isinstance(url_rule, dict):
        # just a static string, use that
        return url_rule

    url = entry.get("url")
    url_parts = urlparse.urlparse(url)

    pat_scheme = url_rule.get('scheme')
    pat_domain = url_rule.get('domain')
    pat_path = url_rule.get('path')
    pat_query = url_rule.get('query')
    pat_fragment = url_rule.get('fragment')

    scheme = None
    domain = None
    path = None
    query = None
    fragment = None

    # extract individual parts based on pattern in rule

    ## SCHEME
    if pat_scheme is None or pat_scheme == "":
        scheme = url_parts.scheme
    else:
        temp = re.search(pat_scheme, url_parts.scheme)
        if temp and len(temp.groups()) > 1:
            scheme = temp.group(1)
        elif temp:
            scheme = temp.group(0)
        else:
            scheme = url_parts.scheme

    ## DOMAIN
    if pat_domain is None or pat_domain == "":
        domain = url_parts.netloc
    else:
        temp = re.search(pat_domain, url_parts.netloc)
        if temp and len(temp.groups()) > 1:
            domain = temp.group(1)
        elif temp:
            domain = temp.group(0)
        else:
            domain = url_parts.netloc

    ## PATH
    if pat_path is None:
        path = url_parts.path  # not specified means pass through
    elif pat_path == "":  # leave empty as empty
        path = ""
    else:
        temp = re.search(pat_path, url_parts.path)
        if temp and len(temp.groups()) > 1:
            path = temp.group(1)
        elif temp:  # no matching groups
            path = temp.group(0)
        else:  # nothing matched
            path = url_parts.path

    ## QUERY
    if pat_query is None:
        query = url_parts.query
    elif pat_query == "":
        query = ""
    else:
        temp = re.search(pat_query, url_parts.query)
        if temp and len(temp.groups()) > 1:
            query = temp.group(1)
        elif temp:  # no matching groups
            query = temp.group(0)
        else:  # nothing matched
            query = url_parts.query

    ## FRAGMENT
    if pat_fragment is None:
        pat_fragment = url_parts.fragment
    elif pat_fragment == "":
        fragment = ""
    else:
        temp = re.search(pat_fragment, url_parts.fragment)
        if temp and len(temp.groups()) > 1:
            fragment = temp.group(1)
        elif temp:
            fragment = temp.group(0)
        else:
            fragment = url_parts.fragment

    return urlparse.urlunparse((scheme, domain, path, url_parts.params,
                                query, fragment))


def match_condition(cond,  history):
    matching = []
    for h in history:
        url = h.get("url")
        url_parts = urlparse.urlparse(url)

        cond_scheme = cond.get('scheme')
        cond_domain = cond.get('domain')
        cond_path = cond.get('path')
        cond_query = cond.get('query')
        cond_fragment = cond.get('fragment')

        matched_scheme = False
        matched_domain = False
        matched_path = False
        matched_query = False
        matched_fragment = False

        # DOMAIN
        if not cond_scheme or re.search(cond_scheme, url_parts.scheme):
            matched_scheme = True

        # DOMAIN
        if not cond_domain or re.search(cond_domain, url_parts.netloc):
            matched_domain = True

        # PATH
        if cond_path == "":
            if url_parts.path == "":
                matched_path = True
        elif not cond_path or re.search(cond_path, url_parts.path):
            matched_path = True

        # QUERY
        if cond_query == "":
            if url_parts.query == "":
                matched_query = True
        elif not cond_query or re.search(cond_query, url_parts.query):
            matched_query = True

        # FRAGMENT
        if cond_fragment == "":
            if url_parts.fragment == "":
                matched_fragment = True
        if not cond_fragment or re.search(cond_fragment, url_parts.fragment):
            matched_fragment = True

        if matched_scheme and matched_domain and matched_path and \
           matched_query and matched_fragment:
            matching.append(h)

    return matching


# remove all entries in exclude from history, return new list
def remove_history(history, exclude):
    new_history = []
    for h in history:
        keep = True
        for e in exclude:
            if e['url'] == h['url']:
                keep = False
        if keep:
            new_history.append(h)
    return new_history


def extract_with_regex(entry, rule):
    url_parts = urlparse.urlparse(entry['url'])

    if isinstance(rule, dict):
        # apply regex to extract value
        if 'var' not in rule or 'pattern' not in rule:
            sys.stderr.write("Error: var and pattern required for regex\n")
            sys.stderr.write("  %s\n" % json.dumps(rule))
        else:
            var = rule['var']
            if var == "title":
                source = entry['title']
            elif var == "domain":
                source = url_parts.netloc
            elif var == "path":
                source = url_parts.path
            elif var == "query":
                source = url_parts.query
            elif var == "fragment":
                source = url_parts.fragment
            if source:
                temp = re.search(rule['pattern'], source)
                if temp:
                    return temp.group(1)
    elif rule:
        # just a static string, use that directly
        return rule

    return None


def cluster_history(brand, history):
    ## Step 1 - filter all history that does not match the list of domains
    ## for the brand
    domains = brand.get('match_domains', [])
    history = match_domains(domains, history)

    ## Step 2 - apply each rule in order to categorize all history items
    category_order = []
    categories = {}
    for r in brand['rules']:
        category = r.get('category')
        if not category:
            sys.stderr.write("Error: ignoring rule\n")
            sys.stderr.write("  %s\n" % json.dumps(r))
            continue

        match = r.get('match')
        if match:
            matching = match_condition(match, history)
            if len(matching) == 0 and r.get('always_show') and \
               isinstance(r.get('url'), str) and \
               isinstance(r.get('title'), str):
                temp = {
                    'url': r['url'],
                    'title': r['title']
                }
                matching = [temp]
            for m in matching:
                entry = {}

                # get category, static or from regex
                category = extract_with_regex(m, r.get('category'))

                if category not in category_order:
                    category_order.append(category)
                    categories[category] = []

                # mark this raw entry as in a category
                if category:
                    m['category'] = category

                # apply title
                new_title = extract_with_regex(m, r.get('title'))
                if new_title:
                    entry['title'] = new_title
                else:
                    entry['title'] = m['title']

                # collapse to a url
                new_url = rewrite_url(m, r.get('url'))
                if new_url:
                    entry['url'] = new_url
                    entry['old_urls'] = [m['url']]
                else:
                    entry['url'] = m['url']
                    entry['old_urls'] = []
                categories[category].append(entry)

    ## Step 3 - place all uncategoried entries in special category
    if 'uncategorized' not in category_order:
        category_order.append('uncategorized')
        categories['uncategorized'] = []
    for h in history:
        if not 'category' in h:
            categories['uncategorized'].append(h)

#    print json.dumps(categories, indent=4)

    ## Step 4 - check for valid config
    base = categories.get('base')
    if not base:
        print "ERROR: no base entry"
        return

    ## Step 5 - collapse urls with the same url together
    for c in category_order:
        if c == "uncategorized":
            # don't try to collapse uncategorized entries
            continue

        # remove entries that have the same titles as a previous entry
        keep = []
        for h in categories[c]:
            entry = None
            for k in keep:
                if k['url'] == h['url']:
                    entry = k
            if entry:
                entry['old_urls'] += h['old_urls']
            else:
                entry = h
                keep.append(entry)

        categories[c] = keep

    ## Step 6 - build cluster config
    cluster = {
        'name': categories['base'][0]['title'],
        'summary': brand['summary'],
        'url': categories['base'][0]['url'],
        'control': [],
        'control_set': {},
        'topics': [],
    }
    for c in category_order:
        if c == 'control':
            cluster['control'] = categories['control']
        # elif c == 'base':
        #     pass
        # elif c == 'exclude':
        #     pass
        # elif c == 'uncategorized':
        #     pass
        else:
            topic = {
                'label': c,
                'color': "#CC3399",
                'urls': []
            }
            topic['urls'] = categories[c]
            cluster['topics'].append(topic)

    #print json.dumps(uncategorized, indent=2)
    return cluster


def print_result(cluster, verbose):
    print "==== CLUSTER ===="
    print "%s: %s" % (cluster['name'], cluster['summary'])
    print "%s" % cluster['url']

    print "CONTROL"
    for c in cluster['control']:
        print "  %s - %s" % (c['url'], c['title'])
        if verbose and 'old_urls' in c:
            for o in c['old_urls']:
                print "     %s" % o

    for t in cluster['topics']:
        print "TOPIC: %s" % t['label']
        for i in t['urls']:
            print "  %s - %s" % (i['url'], i['title'])
            if verbose and 'old_urls' in i:
                for o in i['old_urls']:
                    print "     %s" % o


if __name__ == "__main__":
    usage = "usage: %prog brand_file brand_name [history_file]\n" \
            " - reads list of history entries from stdin if file not specified"
    parser = OptionParser(usage=usage)

    parser.add_option("-v", dest="verbose", action="store_true", default=False,
                      help="verbose output")

    (options, args) = parser.parse_args()

    if len(args) < 2:
        parser.print_help()
        sys.exit(1)

    brands_file = args[0]
    brand_name = args[1]
    if len(args) > 2:
        history_file = args[2]
    else:
        history_file = None

    history = read_history(history_file)
    brands = read_brands(brands_file)

    if brand_name not in brands:
        print " Could not find brand %s in brand list." % brand_name
        sys.exit(1)

    brand = brands[brand_name]
    cluster = cluster_history(brand, history)
    if cluster:
        print_result(cluster, options.verbose)

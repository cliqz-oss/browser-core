#!/usr/bin/env python

"""
Converts "programs" in our DSL to JS.

Needs the pyparsing library (<tt>sudo pip install pyparsing</tt>).)

@author David Mark Nemeskey <david@cliqz.com>
"""

from argparse import ArgumentParser
import re
from string import Template
import yaml

from pyparsing import *

"""
DSL format:

# Comment
site: GitHub
url: github
summary: XYZ     # Default: Your sitemap for $site

"""

test_data = """
program:
    site: GitHub
        url: github
        summary: Welcome to $site
        control:
            label: Website
            cond: len == 0
        control:
            label: settings
            icon: aaaaaaaaaa
            cond: /settings/
        topic:
            label: Orgs
            cond: len == 1
        topic:
            label: Repos
            cond: len == 2

    site: Wikipedia
        url: wikipedia
        control:
            label: Website
            cond: len == 0
        topic:
            label: Concepts
            cond: (len == 2) and (/wiki/)

    site: Twitter
        url: twitter
        control:
            label: Website
            cond: len == 0
        control:
            label: settings
            cond: /settings/
        topic:
            label: People
            cond: len == 1

    site: Klout
        url: klout
        control:
            label: Website
            cond: len == 0
        control:
            label: settings
            cond: /settings/
        exclude:
            cond: (/*/register/) or (/dashboard/) or (/home/)
        topic:
            label: People
            cond: len == 1
    """

### The basic building blocks

class Condition(object):
    @classmethod
    def parser(cls, *args):
        """Returns the object that parses this kind of condition."""
        raise NotImplementedError('Condition.parser()')

    def condition(self):
        """Returns the object that generates the JS condition code."""
        return None

    def capture(self):
        """
        Returns the captured variables as a dictionary. Not all conditions can
        do capturing, so the default is to return and empty map.
        """
        return {}

    @staticmethod
    def filter_true(conds):
        """
        Filters @c true clauses (returned by conditions that are not really
        conditions) from conditions, so that we do not spam the generated code.
        """
        conds = filter(lambda c: c != 'true', conds)
        if len(conds) == 0:
            return ['true']
        else:
            return conds

class CondPart(object):
    """The condition that corresponds to a url part."""
    @classmethod
    def parser(cls, *args):
        """Returns the object that parses this kind of condition."""
        raise NotImplementedError('Condition.parser()')

    def condition(self, index, capturing=False):
        """
        Returns the object that generates the JS condition code.

        @param index the index of the CondPart object in the url list.
        @param capturing whether we are in a capturing context.
        """
        return 'true'

class Term(CondPart):
    def __init__(self, word):
        self.word = word

    @classmethod
    def parser(cls, *args):
        def __create(toks):
            return Term(toks[0])
        return Regex(ur'\w[-?&=\w:.]*', re.UNICODE).setParseAction(__create)

    def condition(self, index, capturing=False):
        return "vpath[{}] == '{}'".format(index, self.word)

class RegexCP(CondPart):
    """
    Regular Python regex, with two limitations: it cannot contain neither '/'
    nor '}'.
    """
    def __init__(self, regex):
        self.regex = regex

    @classmethod
    def parser(cls, *args):
        def __create(toks):
            return RegexCP(toks[0])
        return Regex(ur're:[^/}]+', re.UNICODE).setParseAction(__create)

    def condition(self, index, capturing=False):
        """Returns a simpler test if not in a capturing context."""
        if capturing:
            return "vpath.length > {0} && (cond_match = vpath[{0}].match(/{1}/)) != null".format(index, self.regex[3:])
        else:
            return "/{}/.test(vpath[{}])".format(self.regex[3:], index)

class SameAs(CondPart):
    """
    Same as other part of the path. Does not work between path and subdomain
    parts.
    """
    def __init__(self, original_index):
        """Original index starts from 1."""
        self.original_index = original_index - 1

    @classmethod
    def parser(cls, *args):
        def __create(toks):
            return SameAs(int(toks[0]))
        return (Literal('=').suppress() +
                Regex(ur'\d+', re.UNICODE)).setParseAction(__create)

    def condition(self, index, capturing=False):
        return 'vpath[{}] == vpath[{}]'.format(index, self.original_index)

class Asterisk(CondPart):
    @classmethod
    def parser(cls, *args):
        def __create():
            return Asterisk()
        return Literal('*').setParseAction(__create)

class Variable(CondPart):
    def __init__(self, name, cond):
        """
        @param name the name of the variable.
        @param cond the (optional) restriction on the path part.
        """
        if name not in Program.CAPTURE_VARS:
            raise ValueError(
                'Invalid name ({}) for captured variable; '.format(name)
                + 'must be one of ({})'.format(', '.join(Program.CAPTURE_VARS)))
        self.name = name
        self.cond = cond
        if isinstance(cond, RegexCP):
            self.capt = Template(
                "(cond_match.length > 1) ? cond_match[1] : vpath[$I]")
        else:
            self.capt = Template("vpath[$I]")

    @classmethod
    def parser(cls, *args):
        def __create(toks):
            if len(toks) > 1:
                return Variable(toks[0], toks[1])
            else:
                return Variable(toks[0], Asterisk())
        part = RegexCP.parser() | Term.parser() | Asterisk.parser() | SameAs.parser()
        return (Literal('{').suppress() + Regex(ur'[\w]+', re.UNICODE) +
                Optional(Literal('::').suppress() + part) +
                Literal('}').suppress()).setParseAction(__create)

    def condition(self, index, capturing=False):
        """A Variable cannot be in a capturing context."""
        return self.cond.condition(index, True)

    def capture(self, i):
        return self.capt.substitute({'I': i})

class UrlCond(Condition):
    def __init__(self, parts):
        self.parts = parts

    @classmethod
    def parser(cls, *args):
        def __create(toks):
            return UrlCond([tok for tok in toks])
        part = (Variable.parser() | RegexCP.parser() | Term.parser() |
                Asterisk.parser() | SameAs.parser())
        expr = (Literal('/').suppress() + OneOrMore(part +
                Literal('/').suppress())).setParseAction(__create)
        return expr

    def condition(self):
        js_conds = []
        for i, part in enumerate(self.parts):
            js_cond = part.condition(i)
            if js_cond is not None:
                js_conds.append(js_cond)
        js_conds = Condition.filter_true(js_conds)
        return ' && '.join(js_conds)

    def capture(self):
        """Variables are captured."""
        ret = {}
        for i, part in enumerate(self.parts):
            if isinstance(part, Variable):
                ret[part.name] = part.capture(i)
        return ret

class DomainCond(UrlCond):
    def __init__(self, parts):
        self.parts = parts

    @classmethod
    def parser(cls, *args):
        def __create(toks):
            r = [tok for tok in toks]
            r.reverse()
            return DomainCond(r)
        part = Variable.parser() | RegexCP.parser() | Term.parser() | Asterisk.parser()
        expr = (OneOrMore(Literal('.').suppress() + part)).setParseAction(__create)
        return expr

    def condition(self):
        return UrlCond.condition(self).replace('vpath', 'dpath')

### Functions

class Length(Condition):
    """The number of url parts must be equal to a number."""
    def __init__(self, length):
        self.length = length

    @classmethod
    def parser(cls, *args):
        def __create(toks):
            return Length(int(toks[0]))
        return (Keyword('len').suppress() + Keyword('==').suppress() +
                Regex(ur'[0-9]+')).setParseAction(__create)

    def condition(self):
        return "vpath.length == {}".format(self.length)

### Logical connectives

class Connective(Condition):
    def __init__(self, conn, conds):
        self.conn = conn
        self.conds = conds

    def capture(self):
        """The captures in the conditions under this connective are merged."""
        ret = {}
        for cond in self.conds:
            ret.update(cond.capture())
        return ret

    def condition(self):
        conds = Condition.filter_true(c.condition() for c in self.conds)
        if len(conds) > 1:
            return self.conn.join('({})'.format(c) for c in conds)
        else:
            return conds[0]

class AndConds(Connective):
    def __init__(self, conds):
        Connective.__init__(self, ' && ', conds)

    @classmethod
    def parser(cls, args):
        def __create(toks):
            return AndConds([tok for tok in toks])
        cond = Literal('(').suppress() + args + Literal(')').suppress()
        return (cond +
                OneOrMore(Keyword('and').suppress() +
                cond)).setParseAction(__create)

class OrConds(Connective):
    def __init__(self, conds):
        Connective.__init__(self, ' || ', conds)

    @classmethod
    def parser(cls, args):
        def __create(toks):
            return OrConds([tok for tok in toks])
        cond = Literal('(').suppress() + args + Literal(')').suppress()
        return (cond +
                OneOrMore(Keyword('or').suppress() +
                cond)).setParseAction(__create)

### Derived conditions

class UrlCondWithLength(AndConds):
    @classmethod
    def parser(cls, *args):
        def __create(toks):
            if len(toks) > 1:
                url_cond = toks[0]
                length = Length(len(url_cond.parts))
                return UrlCondWithLength([length, url_cond])
            else:
                return toks[0]
        expr = (UrlCond.parser() ^
                (UrlCond.parser() + Literal('/'))).setParseAction(__create)
        return expr

class DomainCondWithLength(AndConds):
    @classmethod
    def parser(cls, *args):
        def __create(toks):
            if len(toks) > 1:
                domain_cond = toks[1]
                length = Length(len(domain_cond.parts))
                return DomainCondWithLength([length, domain_cond])
            else:
                return toks[0]
        # No, Optional() doesn't work >:(((
        expr = ((Literal('.') + DomainCond.parser()) ^
                DomainCond.parser()).setParseAction(__create)
        return expr

class FullUrlCond(AndConds):
    @classmethod
    def parser(cls, *args):
        def __create(toks):
            return FullUrlCond([tok for tok in toks])
        expr = (UrlCondWithLength.parser() ^
                (DomainCondWithLength.parser() + Literal('/').suppress()) ^
                DomainCondWithLength.parser() + UrlCondWithLength.parser()).setParseAction(__create)
        return expr

class Program(object):
    OUTER_TEMPLATE = Template(
"""
var COLORS = [$COLORS];

var templates = {

$SWITCH
};""")

    INNER_TEMPLATE = Template(
"""    '$url': {
        fun: function(urls) {

            var site = '$site';
            var template = {
                summary: CliqzUtils.getLocalizedString('$summary').replace('{}', site),
                control: [$FIX_CONTROLS],
                control_set: {},
                topics: [],
                url: '$home'
            };

            var next_color = 0;
            var cond_match = null;  // For groups in regex conditions

            for(let i=0; i<urls.length;i++) {
                var url = urls[i]['value'];
                var title = urls[i]['comment'];
                if ($drop_url_parameters) {
                    var param_index = url.indexOf("?");
                    if (param_index != -1) url = url.slice(0, param_index);
                }
                if ($drop_url_fragment) {
                    var param_index = url.indexOf("#");
                    if (param_index != -1) url = url.slice(0, param_index);
                }

                var urlDetails = CliqzUtils.getDetailsFromUrl(url),
                    domain = urlDetails.host,
                    path = urlDetails.path;
                var dpath = domain.toLowerCase().split('.');
                dpath.reverse();
                var vpath = path.toLowerCase().split('/');

                // remove last element if '', that means that path ended with /
                // also remove first element if '',

                if (vpath[vpath.length-1]=='') vpath=vpath.slice(0,vpath.length-1);
                if (vpath[0]=='') vpath=vpath.slice(1,vpath.length);

                CliqzClusterHistory.log(JSON.stringify([url, path, vpath]));

$RULES
            }

            CliqzClusterHistory.log(JSON.stringify(template));
            return template;
        }
    }""")

    FIX_CONTROL_TEMPLATE = Template("{title: CliqzUtils.getLocalizedString('$title'), url: '$url', "
            + "iconCls: '$icon'}")

    CONTROL_TEMPLATE = Template(
"""$ITEM_TITLE
                    if (item_title != null && item_title.length != 0
                            && !template['control_set'].hasOwnProperty(item_title)) {
                        var control = {title: item_title, url: url, iconCls: '$icon'};
                        template['control'].push(control);
                        template['control_set'][item_title] = true;
                    }
"""
    )

    TOPIC_TEMPLATE = Template(
"""                    // Check if the first level (label) exists
                    var topic = null
                    for(let j=0; j<template['topics'].length; j++) {
                        if (template['topics'][j]['label']==label) topic = template['topics'][j];
                    }

                    // if the topic did not exist, we must create it
                    if ((topic==null) && (template['topics'].length<4)) {
                        topic = {'label': label, urls: []$LABEL_URL, color: COLORS[next_color], label_set: {}, iconCls: '$icon'};
                        template['topics'].push(topic);
                        next_color = (next_color+1)%COLORS.length;
                    }

$ITEM_TITLE
                    if (item_title != null && item_title.length != 0 && topic!=null
                            && !topic['label_set'].hasOwnProperty(item_title)) {
                        topic['urls'].push({href: url, path: path, title: item_title})
                        topic['label_set'][item_title] = true;
                    }"""
    )

    ITEM_TITLE_TEMPLATE = Template(
"""                    var title_match = $title.match(/$regex/);
                    if (title_match != null && title_match.length > 1) {
                        var item_title = title_match[1];
                    } else {
                        var item_title = $title;
                    }"""
    )

    RULE_TEMPLATE = Template(
"""                ${else}if ($cond) {
$CAPTURE
$RULE_BODY
                }"""
    )

    # The variables that can be used in a capturing context
    CAPTURE_VARS = set(['label', 'item'])

    # The variables that are defined in the JS code; CAPTURE_VARS are added to
    # this
    JS_VARS = set(['url', 'title'])

    def __init__(self):
        self.colors = ['#000000']
        self.programs = []

    def _condition_language(self):
        expr = FullUrlCond.parser()
        pattern = Forward()
        pattern << (expr | OrConds.parser(pattern) | AndConds.parser(pattern))
        return pattern

    def parse(self, program_file):
        """Parses @p program_file."""
        cl = self._condition_language()
        with open(program_file) as inf:
            script_dict = yaml.load(inf)
        if 'colors' in script_dict:
            self.colors = script_dict['colors']
        for site, p in script_dict['program'].iteritems():
            fix_controls = []
            regular_rules = []
            for rule in p['rules']:
                if 'icon' not in rule:
                    rule['icon'] = 'null'

                # Hardcoded controls
                if rule['type'] == 'control' and rule.get('cond') is None:
                    if not ('url' in rule and 'title' in rule):
                        raise ValueError('Controls must have either a cond or '
                                         + 'a url and a title field')
                    fix_controls.append(rule)
                else:
                    cond = cl.parseString(rule['cond'])[0]
                    rule['cond'] = cond.condition()
                    rule['capture'] = cond.capture()
                    rule['else'] = 'else ' if len(regular_rules) > 0 else ''
                    regular_rules.append(rule)
            p['site'] = site
            p['fix_controls'] = fix_controls
            p['rules'] = regular_rules
            self.programs.append(p)

    def _generate_colors(self):
        return "'" + "', '".join(self.colors) + "'"

    def _generate_capture(self, rule):
        """
        Generates the CAPTURE part of the rule. All variables that could be
        captured are given values, either from the rule specification or from
        the URL capture.
        """
        assignments = []
        for var in Program.CAPTURE_VARS:
            if var in rule['capture']:  # From path
                assignments.append(
                    "                    var {} = decodeURIComponent({});\n".format(
                        var, rule['capture'][var]))
            elif var in rule:  # Manual, localized value
                assignments.append(
                    "                    var {} = CliqzUtils.getLocalizedString('{}');\n".format(
                        var, rule[var]))
            else:  # nothing
                assignments.append(
                    "                    var {} = null;\n".format(var))
        return ''.join(assignments)

    def _get_item_title(self, rule, key, def_value):
        """
        Returns
        - if key is a captured variable (incl. url and title): its value,
          otherwise the localized string assigned to key;
        - if not, def_value.

        This method also handles regex-filtered titles.
        """
        def handle_title_refs(rule, key, def_value):
            all_var_keys = Program.JS_VARS | set(rule['capture'].keys())
            var_keys = all_var_keys - set([key])

            # Key points to a variable ...
            if key in all_var_keys:
                # ... other than itself (title -> item)
                if key in var_keys:
                    return key
                # ... to itself (title -> title).
                elif key == rule[key]:
                    return rule[key]
                # ... to something else (title -> blablabla)
                else:
                    return "CliqzUtils.getLocalizedString('{}')".format(rule[key])
            else:
                return "CliqzUtils.getLocalizedString('{}')".format(rule[key])

        if key in rule:
            v_pattern = (
                Regex(r'[\w_]+') + Optional(Literal('::').suppress() +
                Literal('re:').suppress() + Regex(r'.+'))
            )
            v_result = v_pattern.parseString(rule[key])
            # A regex
            if len(v_result) == 2:
                rule_mod = dict(rule)
                rule_mod.update({key: v_result[0]})
                return Program.ITEM_TITLE_TEMPLATE.substitute({
                    'title': handle_title_refs(rule_mod, v_result[0], def_value),
                    'regex': v_result[1]
                })
            # Only a string
            else:
                return """                    var item_title = {};""".format(
                    handle_title_refs(rule, key, def_value))
        else:
            return """                    var item_title = {};""".format(
                def_value)

    def _generate_program(self, program):
        """Generates the control for the program."""
        ret = dict(program)
        ret['FIX_CONTROLS'] = ",\n                          ".join(
            Program.FIX_CONTROL_TEMPLATE.substitute(rule) for rule
            in program['fix_controls'])
        if 'home' not in ret:
            ret['home'] = ret['url']
        if 'drop_url_parameters' not in ret:
            ret['drop_url_parameters'] = 'true';
        if 'drop_url_fragment' not in ret:
            ret['drop_url_fragment'] = 'true';

        # Ehhh... so that we output false, not False...
        ret['drop_url_parameters'] = str(ret['drop_url_parameters']).lower()
        ret['drop_url_fragment'] = str(ret['drop_url_fragment']).lower()

        control_index = 0
        rules = []
        for rule in program['rules']:
            if rule['type'] == 'control':
                rule['index'] = control_index
                rule['CAPTURE'] = self._generate_capture(rule)
                rule['ITEM_TITLE'] = self._get_item_title(rule, 'title', 'item')
                rule['RULE_BODY'] = Program.CONTROL_TEMPLATE.substitute(rule)
                control_index += 1
            elif rule['type'] == 'topic':
                rule['CAPTURE'] = self._generate_capture(rule)
                if 'labelUrl' in rule:
                    label_path = ", 'labelUrl': domain"
                    for i in xrange(int(rule['labelUrl'])):
                        label_path += "+'/'+vpath[{}]".format(i)
                    rule['LABEL_URL'] = label_path
                else:
                    rule['LABEL_URL'] = ''
                rule['ITEM_TITLE'] = self._get_item_title(rule, 'title', 'item')
                rule['RULE_BODY'] = Program.TOPIC_TEMPLATE.substitute(rule)
            else:
                rule['RULE_BODY'] = ''
                rule['CAPTURE'] = ''
            rules.append(Program.RULE_TEMPLATE.substitute(rule))

        ret['RULES'] = "\n".join(rules)
        return ret

    def generate(self):
        """Generates the program parsed in parse()."""
        return Program.OUTER_TEMPLATE.substitute({
            'COLORS': self._generate_colors(),
            'SWITCH': ",\n".join(Program.INNER_TEMPLATE.substitute(
                self._generate_program(program))
                                 for program in self.programs)
        })


if __name__ == '__main__':
    ap = ArgumentParser(
        description="Converts \"programs\" in our DSL to JS." +
                    "Needs the pyparsing library (sudo pip install pyparsing).")
    ap.add_argument('template_file', help='template file, into which the ' +
                    'generated code is written. It replaces the $DSL_OUTPUT ' +
                    'key.')
    ap.add_argument('program_file', help='the program file to convert to JS')
    args = ap.parse_args()

    with open(args.template_file) as inf:
        template = Template(inf.read())
    p = Program()
    p.parse(args.program_file)
    print template.substitute({'DSL_OUTPUT': p.generate()})

# TODO: overhaul variable capture. It does not work well with the or connective
# TODO: rewrite with functions instead of objects and direct, immediate translation

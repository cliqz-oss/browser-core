"use strict";

var acorn = require('acorn');
var astring = require('astring');
var Filter = require('broccoli-persistent-filter');
var crypto = require('crypto');

Instrument.prototype = Object.create(Filter.prototype);
Instrument.prototype.constructor = Instrument;
function Instrument(inputNode, options) {
  this.version = '0.1.0';
  this.options = options || {};
  this.threshold = this.options.threshold||0;
  Filter.call(this, inputNode, this.options);
  this.extensions = ['js'];
}

Instrument.prototype.processString = function(content, relativePath) {
  var origTree = acorn.parse(content,  { sourceType: 'module', locations:true});
  var tree = JSON.parse(JSON.stringify(origTree));
  let res = astring(instrumentCode(tree, relativePath, this.threshold));
  return res;
};

function instrumentCode(node, fileName, threshold) {
  Object.keys(node).forEach(k => {
    if (node[k] && typeof node[k] === 'object') {
      node[k] = instrumentCode(node[k], fileName, threshold);
    }
  });
  if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
    return instrumentFunction(node, fileName, threshold);
  }
  return node;
}

// Takes a node of type ArrowFunctionExpression, FunctionDeclaration or FunctionExpression
// and adds very simple instrumentation for measuring time spent in the function. Then calls dump(...)
// if the time exceeds a given threshold (which is now hardcoded to 10ms).

// A lot of improvements can be made: using a better measuring function than Date.now(), doing sth else insted of
// dump, calculating graph/tree of calls...

// Also, the already generated babel tree could be used, or a Babel transform plugin, but since this code was written separately
// of Babel, it would have to be rewritten.
function instrumentFunction(node, fileName, threshold) {
  let col = node.loc ? node.loc.start.column : '';
  let line = node.loc ? node.loc.start.line : '';
  let fnname = node.id ? node.id.name : '';
  let text = `ms ${fileName} line:${line} col:${col} fn:${fnname}\n`;
  let varName = '_' + crypto.createHash('md5').update(text).digest('hex').slice(0, 8);
  let varTime = varName + 1;
  let varCall = varName + 2;
  let varDiff = varName + 3;

  if (node.type === 'ArrowFunctionExpression') {
    if (node.body.type !== 'BlockStatement') {
      node.body = {
        "type": "BlockStatement",
        "body": [
            {
                "type": "ReturnStatement",
                "argument": node.body
            }
        ]
      };
      node.expression = false;
    }
  }

  node.body.body.unshift({
      "type": "VariableDeclaration",
      "declarations": [
          {
              "type": "VariableDeclarator",
              "id": {
                  "type": "Identifier",
                  "name": varTime
              },
              "init": {
                  "type": "CallExpression",
                  "callee": {
                      "type": "MemberExpression",
                      "computed": false,
                      "object": {
                          "type": "Identifier",
                          "name": "Date"
                      },
                      "property": {
                          "type": "Identifier",
                          "name": "now"
                      }
                  },
                  "arguments": []
              }
          }
      ],
      "kind": "const"
  }, {
    "type": "VariableDeclaration",
    "declarations": [
        {
            "type": "VariableDeclarator",
            "id": {
                "type": "Identifier",
                "name": varCall
            },
            "init": {
                "type": "ArrowFunctionExpression",
                "id": null,
                "params": [
                    {
                        "type": "Identifier",
                        "name": "v"
                    }
                ],
                "defaults": [],
                "body": {
                    "type": "BlockStatement",
                    "body": [
                        {
                            "type": "VariableDeclaration",
                            "declarations": [
                                {
                                    "type": "VariableDeclarator",
                                    "id": {
                                        "type": "Identifier",
                                        "name": varDiff
                                    },
                                    "init": {
                                        "type": "BinaryExpression",
                                        "operator": "-",
                                        "left": {
                                            "type": "CallExpression",
                                            "callee": {
                                                "type": "MemberExpression",
                                                "computed": false,
                                                "object": {
                                                    "type": "Identifier",
                                                    "name": "Date"
                                                },
                                                "property": {
                                                    "type": "Identifier",
                                                    "name": "now"
                                                }
                                            },
                                            "arguments": []
                                        },
                                        "right": {
                                            "type": "Identifier",
                                            "name": varTime
                                        }
                                    }
                                }
                            ],
                            "kind": "const"
                        },
                        {
                            "type": "IfStatement",
                            "test": {
                                "type": "BinaryExpression",
                                "operator": ">=",
                                "left": {
                                    "type": "Identifier",
                                    "name": varDiff
                                },
                                "right": {
                                   "type": "Literal",
                                   "value": threshold,
                                   "raw": JSON.stringify(threshold)
                                }
                            },
                            "consequent": {
                                "type": "ExpressionStatement",
                                "expression": {
                                  "type": "CallExpression",
                                  "start": 0,
                                  "end": 44,
                                  "callee": {
                                    "type": "MemberExpression",
                                    "start": 0,
                                    "end": 21,
                                    "object": {
                                      "type": "Identifier",
                                      "start": 0,
                                      "end": 10,
                                      "name": "CliqzUtils"
                                    },
                                    "property": {
                                      "type": "Identifier",
                                      "start": 11,
                                      "end": 21,
                                      "name": "setTimeout"
                                    },
                                    "computed": false
                                  },
                                  "arguments": [
                                    {
                                      "type": "ArrowFunctionExpression",
                                      "start": 22,
                                      "end": 40,
                                      "id": null,
                                      "generator": false,
                                      "expression": true,
                                      "params": [],
                                      "body": {
                                        "type": "CallExpression",
                                        "callee": {
                                            "type": "Identifier",
                                            "name": "dump"
                                        },
                                        "arguments": [
                                            {
                                              "type": "BinaryExpression",
                                              "operator": "+",
                                              "left": {
                                                "type": "TemplateLiteral",
                                                "start": 0,
                                                "end": 35,
                                                "expressions": [
                                                  {
                                                    "type": "CallExpression",
                                                    "start": 5,
                                                    "end": 31,
                                                    "callee": {
                                                      "type": "MemberExpression",
                                                      "start": 5,
                                                      "end": 29,
                                                      "object": {
                                                        "type": "NewExpression",
                                                        "start": 6,
                                                        "end": 16,
                                                        "callee": {
                                                          "type": "Identifier",
                                                          "start": 10,
                                                          "end": 14,
                                                          "name": "Date"
                                                        },
                                                        "arguments": []
                                                      },
                                                      "property": {
                                                        "type": "Identifier",
                                                        "start": 18,
                                                        "end": 29,
                                                        "name": "toISOString"
                                                      },
                                                      "computed": false
                                                    },
                                                    "arguments": []
                                                  }
                                                ],
                                                "quasis": [
                                                  {
                                                    "type": "TemplateElement",
                                                    "start": 1,
                                                    "end": 3,
                                                    "value": {
                                                      "raw": "[",
                                                      "cooked": "["
                                                    },
                                                    "tail": false
                                                  },
                                                  {
                                                    "type": "TemplateElement",
                                                    "start": 32,
                                                    "end": 34,
                                                    "value": {
                                                      "raw": "] ",
                                                      "cooked": "] "
                                                    },
                                                    "tail": true
                                                  }
                                                ]
                                              },
                                              "right": {
                                                "type": "BinaryExpression",
                                                "operator": "+",
                                                "left": {
                                                    "type": "Identifier",
                                                    "name": varDiff
                                                },
                                                "right": {
                                                    "type": "Literal",
                                                    "value": text,
                                                    "raw": JSON.stringify(text)
                                                }
                                              }
                                            }
                                        ]
                                      }
                                    },
                                    {
                                      "type": "Literal",
                                      "start": 42,
                                      "end": 43,
                                      "value": 0,
                                      "raw": "0"
                                    }
                                  ]
                                }
                            },
                            "alternate": null
                        },
                        {
                            "type": "ReturnStatement",
                            "argument": {
                                "type": "Identifier",
                                "name": "v"
                            }
                        }
                    ]
                },
                "generator": false,
                "expression": false
            }
        }
    ],
    "kind": "const"
  });

  function modifyReturn(node) {
    return {
        "type": "ReturnStatement",
        "argument": {
            "type": "CallExpression",
            "callee": {
                "type": "Identifier",
                "name": varCall
            },
            "arguments": node ? node.argument === null ? {"type": "Literal", "value": null, "raw": "null"} : [node.argument] : []
        }
    };
  }

  function findReturn(node) {
    if (node && typeof node === 'object') {
      if (node.type === 'ReturnStatement') {
        return modifyReturn(node);
      }
      if (!(node.type === 'ArrowFunctionExpression' || node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression')) {
        Object.keys(node).forEach(k => (node[k] = findReturn(node[k])));
      }
    }
    return node;
  }

  let foundReturn = false;
  node.body.body.forEach((x, i) => {
    if (x.type === 'ReturnStatement') {
      if (!foundReturn) {
        foundReturn = true;
        node.body.body[i] = modifyReturn(x);
      }
    } else {
      node.body.body[i] = findReturn(x);
    }
  });

  if (!foundReturn) {
    node.body.body.push(modifyReturn());
  }

  return node;
}

module.exports = Instrument;
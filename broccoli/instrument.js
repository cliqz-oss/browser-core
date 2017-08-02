"use strict";

const instrument = function (babel) {
  const t = babel.types;
  const salt = 'oRVtlZwFeco';
  const funcName = `${salt}1`;
  const timeName = `${salt}2`;
  const idName = `${salt}3`;

  function getFunctionName(node, parent) {
    let id = node.id || node.key;
    if ((t.isObjectProperty(parent) || t.isObjectMethod(parent, { kind: 'method' })) &&
      (!parent.computed || t.isLiteral(parent.key))) {
      id = parent.key;
    } else if (t.isVariableDeclarator(parent)) {
      id = parent.id;
    } else if (t.isAssignmentExpression(parent)) {
      id = parent.left;
    } else if (!id) {
      return '';
    }

    if (id && t.isLiteral(id)) {
      return id.value;
    } else if (id && t.isIdentifier(id)) {
      return id.name;
    }
    return '';
  }

  function makeTimeDec() {
    const dateNowCall = t.callExpression(
      t.memberExpression(t.identifier('Date'), t.identifier('now')),
      []
    );
    return t.variableDeclaration('let', [t.VariableDeclarator(t.identifier(timeName), dateNowCall)]);
  }

  function makeIdDec(loc, filename, functionName) {
    const col = loc ? loc.start.column : '';
    const line = loc ? loc.start.line : '';
    const text = `${functionName || ''}|${filename}|${line}:${col}`;
    return t.variableDeclaration('let', [t.VariableDeclarator(t.identifier(idName), t.stringLiteral(text))]);
  }
  return {
    visitor: {

      Program(_path, state) {
        if (state.file.opts.filename.endsWith('jsx')) {
          return;
        }
        const myparams = [
          t.identifier('a'),
          t.identifier('b'),
          t.identifier('c'),
        ];

        const cliqzPerf = t.memberExpression(
          t.identifier('CLIQZ'),
          t.identifier('_perf'),
          false
        );

        const dateNowCall = t.callExpression(
          t.memberExpression(t.identifier('Date'), t.identifier('now')),
          []
        );

        const mybody = t.blockStatement([
          t.expressionStatement(
            t.logicalExpression(
              '&&',
              t.logicalExpression(
                '&&',
                t.binaryExpression(
                  '!==',
                  t.unaryExpression(
                    'typeof',
                    t.identifier('CLIQZ'),
                    true
                  ),
                  t.stringLiteral('undefined')
                ),
                cliqzPerf
              ),
              t.callExpression(
                cliqzPerf,
                [myparams[0], t.binaryExpression('-', dateNowCall, myparams[1])]
              )
            )
          ),
          t.returnStatement(myparams[2]),
        ]);
        // On program start, do an explicit traversal up front for your plugin.
        _path.traverse({
          BlockStatement(path) {
            const node = path.node;
            const parent = path.parent;
            const file = state.file;
            if (t.isFunction(parent)) {
              const name = getFunctionName(path.parent, path.parentPath.parent);
              path.unshiftContainer('body', makeIdDec(parent.loc, file.opts.filename, name));
              path.unshiftContainer('body', makeTimeDec());
              if (!t.isReturnStatement(node.body[node.body.length - 1])) {
                path.pushContainer('body', t.returnStatement());
              }
            }
          },
          Expression(path) {
            const node = path.node;
            const parent = path.parent;
            if (t.isArrowFunctionExpression(parent)) {
              path.replaceWith(t.blockStatement([
                t.returnStatement(node)
              ]));
            }
          },
          ReturnStatement(path) {
            const node = path.node;
            if (!node.__instrumented) {
              const args = node.argument ?
                [t.identifier(idName), t.identifier(timeName), node.argument] :
                [t.identifier(idName), t.identifier(timeName)];
              const newNode = t.returnStatement(
                t.callExpression(
                  t.identifier(funcName),
                  args
                )
              );
              newNode.__instrumented = true;
              path.replaceWith(newNode);
            }
          },
        });
        _path.unshiftContainer('body', t.functionDeclaration(t.identifier(funcName), myparams, mybody));
      }
    }
  };
};

module.exports = instrument;

"use strict";

const instrument = function (params) {
  const Plugin = params.Plugin;
  const t = params.types;
  const salt = 'oRVtlZwFeco';
  const funcName = `${salt}1`;
  const timeName = `${salt}2`;
  const idName = `${salt}3`;

  function makeTimeDec() {
    const dateNowCall = t.callExpression(
      t.memberExpression(t.identifier('Date'), t.identifier('now')),
      []
    );
    return t.variableDeclaration('let', [t.VariableDeclarator(t.identifier(timeName), dateNowCall)]);
  }

  function makeIdDec(loc, filename, functionName) {
    functionName = functionName || '';
    const col = loc ? loc.start.column : '';
    const line = loc ? loc.start.line : '';
    const text = `${functionName}|${filename}|${line}:${col}`;
    return t.variableDeclaration('let', [t.VariableDeclarator(t.identifier(idName), t.literal(text))]);
  }

  const visitor = {
    BlockStatement(node, parent, scope, file) {
      if (t.isFunction(parent)) {
        if (!parent.id || parent.id.name !== funcName) {
          const p = this.findParent((x) => x.container && x.container.key && x.container.key.name);
          // There must be better ways of getting function names...
          this.unshiftContainer('body', makeIdDec(parent.loc, file.opts.filename, p && p.container.key.name));
          this.unshiftContainer('body', makeTimeDec());
          if (!t.isReturnStatement(node.body[node.body.length - 1])) {
            this.pushContainer('body', t.returnStatement());
          }
        } else {
          this.skip();
        }
      }
    },
    Program(node, parent, scope, file) {
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
                t.literal('undefined')
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
      this.unshiftContainer('body', t.functionDeclaration(t.identifier(funcName), myparams, mybody));
    },
    Expression(node, parent, scope, file) {
      if (t.isArrowFunctionExpression(parent)) {
        return t.blockStatement([
          makeTimeDec(),
          makeIdDec(parent.loc, file.opts.filename),
          t.returnStatement(node)
        ]);
      }
    },
    ReturnStatement(node) {
      const args = node.argument ?
        [t.identifier(idName), t.identifier(timeName), node.argument] :
        [t.identifier(idName), t.identifier(timeName)]
      return t.returnStatement(
        t.callExpression(
          t.identifier(funcName),
          args
        )
      );
    },
  };
  Plugin.prototype.baseDir = function() { return __dirname; };
  return new Plugin('instrument', { visitor });
};

module.exports = instrument;

/* global describeModule */
/* global chai */
/* global sinon */
const React = require('react');
const { render, unmountComponentAtNode } = require('react-dom');
const { JSDOM } = require('jsdom');
const waitFor = require('../../../offers-v2/unit/utils/waitfor');

const props = (url, dataurl) => ({ url, dataurl });
const intermoduleCallMock = sinon.stub();

export default describeModule('offers-templates/content/widgets/Picture',
  () => ({
    react: { default: React },
    'offers-templates/content/transport': { sendThroughRuntime: intermoduleCallMock },
    'offers-templates/content/utils': { css: () => () => 'logo' },
  }),
  () => {
    describe('/Picture React', () => {
      let Picture;
      let container;

      before(() => {
        const dom = new JSDOM('<!DOCTYPE html><body />>');
        global.window = dom.window;
      });

      after(() => {
        delete global.window;
      });

      beforeEach(function () {
        Picture = this.module().default;
        intermoduleCallMock.reset();

        const doc = global.window.document;
        container = doc.createElement('div');
        doc.body.appendChild(container);
      });

      afterEach(() => {
        unmountComponentAtNode(container);
        container.remove();
        container = null;
      });

      it('/pass empty string if no parameters', () => {
        const el = React.createElement(Picture, { ...props('') });
        render(el, container);

        chai.expect(intermoduleCallMock).to.be.not.called;
        chai.expect(container.innerHTML).to.not.contain('url(');
      });

      it('/use `dataurl` if provided', () => {
        const el = React.createElement(Picture, { ...props('', 'some-dataurl') });
        render(el, container);

        chai.expect(intermoduleCallMock).to.be.not.called;
        chai.expect(container.innerHTML).to.contain('url(some-dataurl)');
      });

      it('/resolve image', async () => {
        const someUrl = 'https://cliqztest.com/img';
        const dataurl = 'someDataurl';
        intermoduleCallMock.callsArgWith(2, { dataurl });
        const el = React.createElement(Picture, {
          ...props(someUrl, ''),
          onLoadImage: () => {
            const newEl = React.createElement(Picture, { ...props(someUrl, dataurl) });
            render(newEl, container);
          }
        });
        render(el, container);
        chai.expect(intermoduleCallMock).calledOnce.calledWith(
          sinon.match.any, { url: someUrl }, sinon.match.any
        );
        await waitFor(() => {
          chai.expect(container.innerHTML).to.contain('url(someDataurl)');
        });
      });
    });
  });

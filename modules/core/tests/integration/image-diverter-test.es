/* global chai */
import { testServer } from '../../core/test-helpers';
import handleReadContentAsDataUrl from '../../../core/image-diverter';
import { divertImages } from '../../../core/content/image-diverter';

const svgData = '<svg>The content is actually not important</svg>';

export default function () {
  context('Image diverter', () => {
    const goodUrlRel = '/ImDi/svg-image-ok.svg';
    const goodUrl = testServer.getBaseUrl(goodUrlRel);

    beforeEach(async () => {
      await testServer.registerPathHandler(
        goodUrlRel,
        { result: svgData,
          headers: [
            { name: 'Content-type', value: 'image/svg+xml' },
            { name: 'Cache-Control', value: 'max-age=300' }] }
      );
    });

    describe('read content as data url', () => {
      it('/ fetch from url and encode as data url, success', async () => {
        const expectedDataUrl = `data:image/svg+xml;base64,${btoa(svgData)}`;

        const gotData = await handleReadContentAsDataUrl(goodUrl);

        chai.expect(gotData).to.eql(expectedDataUrl);
      });

      it('/ error requesting a file on a server', async () => {
        const badUrl = testServer.getBaseUrl('/ImDi/no-such-file');

        const gotData = await handleReadContentAsDataUrl(badUrl);

        chai.expect(gotData).to.be.empty;
      });

      it('/ cache data', async () => {
        await handleReadContentAsDataUrl(goodUrl);
        await handleReadContentAsDataUrl(goodUrl);
        await handleReadContentAsDataUrl(goodUrl);

        const hitCtr = await testServer.getHitCtr(goodUrlRel);
        chai.expect(hitCtr).to.be.most(1);
      });
    });
  });

  context('Image diverter, DOM', () => {
    const html = `<div>
        <p class="cl1" id="neutral1">foo</p>
        <p class="cl2">bar</p>
        <p class="cl2">oof</p>
        <p class="cl7" id="neutral7" style="background-image: url('smth')">rab</p>
    </div>`;
    let htmlDom;
    const fakeReader = url => Promise.resolve(`Fake:${url}`);

    beforeEach(() => {
      htmlDom = (new DOMParser()).parseFromString(html, 'text/html');
    });

    async function touchClass2(reader = fakeReader) {
      const asyncActions = divertImages(htmlDom, { cl2: 'img-for-class-2' }, reader);
      await Promise.all(asyncActions);
    }

    it('/ augment elements with background images', async () => {
      await touchClass2();

      for (const el of htmlDom.getElementsByClassName('cl2')) {
        chai.expect(el.style.backgroundImage).to.eql('url("Fake:img-for-class-2")');
      }
    });

    it('/ retain unknown classes unchanged', async () => {
      await touchClass2();

      let el = htmlDom.getElementById('neutral1');
      chai.expect(el.style.backgroundImage).to.eql('');
      el = htmlDom.getElementById('neutral7');
      chai.expect(el.style.backgroundImage).to.eql('url("smth")');
    });

    it('/ handle reader failure', async () => {
      const failReader = () => Promise.resolve('');

      await touchClass2(failReader);

      for (const el of htmlDom.getElementsByClassName('cl2')) {
        chai.expect(el.style.backgroundImage).to.be.empty;
      }
    });
  });
}

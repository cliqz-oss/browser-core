/* global chai */
/* global describeModule */

const yt = [
  ['https://www.youtube.com/watch?v=DFYRQ_zQ-gk', 'DFYRQ_zQ-gk'],
  ['https://www.youtube.com/watch?v=DFYRQ_zQ-gk&feature=featured', 'DFYRQ_zQ-gk'],
  ['https://www.youtube.com/watch?v=DFYRQ_zQ-gk', 'DFYRQ_zQ-gk'],
  ['http://www.youtube.com/watch?v=DFYRQ_zQ-gk', 'DFYRQ_zQ-gk'],
  ['www.youtube.com/watch?v=DFYRQ_zQ-gk', 'DFYRQ_zQ-gk'],
  ['https://youtube.com/watch?v=DFYRQ_zQ-gk', 'DFYRQ_zQ-gk'],
  ['http://youtube.com/watch?v=DFYRQ_zQ-gk', 'DFYRQ_zQ-gk'],
  ['youtube.com/watch?v=DFYRQ_zQ-gk', 'DFYRQ_zQ-gk'],
  ['https://m.youtube.com/watch?v=DFYRQ_zQ-gk', 'DFYRQ_zQ-gk'],
  ['http://m.youtube.com/watch?v=DFYRQ_zQ-gk', 'DFYRQ_zQ-gk'],
  ['m.youtube.com/watch?v=DFYRQ_zQ-gk', 'DFYRQ_zQ-gk'],
  ['https://www.youtube.com/embed/DFYRQ_zQ-gk?autoplay=1', 'DFYRQ_zQ-gk'],
  ['https://www.youtube.com/embed/DFYRQ_zQ-gk', 'DFYRQ_zQ-gk'],
  ['http://www.youtube.com/embed/DFYRQ_zQ-gk', 'DFYRQ_zQ-gk'],
  ['www.youtube.com/embed/DFYRQ_zQ-gk', 'DFYRQ_zQ-gk'],
  ['https://youtube.com/embed/DFYRQ_zQ-gk', 'DFYRQ_zQ-gk'],
  ['http://youtube.com/embed/DFYRQ_zQ-gk', 'DFYRQ_zQ-gk'],
  ['youtube.com/embed/DFYRQ_zQ-gk', 'DFYRQ_zQ-gk'],
  ['https://youtu.be/DFYRQ_zQ-gk?t=120', 'DFYRQ_zQ-gk'],
  ['https://youtu.be/DFYRQ_zQ-gk', 'DFYRQ_zQ-gk'],
  ['http://youtu.be/DFYRQ_zQ-gk', 'DFYRQ_zQ-gk'],
  ['youtu.be/niMf_A_tGcE', 'niMf_A_tGcE'],

  ['https://www.yt.com/watch?v=DFYRQ_zQ-gk', null],
  ['//www.youtube.com/watch?v=DFYRQ_zQ-gk', null],
  ['//youtube.com/watch?v=DFYRQ_zQ-gk', null],
  ['//m.youtube.com/watch?v=DFYRQ_zQ-gk', null],
  ['//www.youtube.com/watch?v=DFYRQ_zQ-gk', null],
  ['//www.youtube.com/v/DFYRQ_zQ-gk?fs=1&hl=en_US', null],
  ['https://www.faustino.com/watch?v=DFYRQ_zQ-gk', null],
  ['//www.youtube.com/embed/DFYRQ_zQ-gk', null],
  ['//youtube.com/embed/DFYRQ_zQ-gk', null],
  ['//youtu.be/DFYRQ_zQ-gk', null],
  ['https://www.youtube.com/channel/UCb56QJVFzYfB-3-Ng_tLUkw', null],
  ['https://www.youtube.com/playlist?list=PLyjgHc47unfT3BIZo5uEt2a-2TWKy54sU', null],
  ['https://www.youtube.com/user/PietSmittie', null],
];

export default describeModule('video-downloader/utils/get-youtube-id',
  () => ({}),
  () => {
    let getYoutubeID;

    beforeEach(function () {
      getYoutubeID = this.module().default;
    });

    describe('getYoutubeID', function () {
      it('Check urls for Youtube IDs', () => {
        yt.forEach(([url, id]) => {
          chai.expect(getYoutubeID(url)).to.equal(id);
        });
      });
    });
  });

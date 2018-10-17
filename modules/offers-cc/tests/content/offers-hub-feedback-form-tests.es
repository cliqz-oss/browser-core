import {
  expect,
  waitFor,
} from '../../core/test-helpers';
import Subject from './local-helpers';

context('Offers Hub feedback form tests', function () {
  let subject;
  const feedbackVoteSelector = '#feedback-vote-wrapper';
  const feedbackCommentSelector = '#feedback-comment-wrapper';
  const target = 'cliqz-offers-cc';

  context('click on feedback button', function () {
    beforeEach(function () {
      subject = new Subject();
      return subject.load().then(function () {
        return subject.pushData(target, {
          noVoucher: true,
        });
      }).then(function () {
        subject.query('.setting-menu .feedback').click();
        return waitFor(function () {
          return subject.messages.find(message => message.message.action === 'resize');
        });
      });
    });

    afterEach(function () {
      subject.unload();
    });

    it('renders feedback vote wrapper', function () {
      expect(subject.query('.overlay')).to.have.class('show');
      expect(subject.query(feedbackVoteSelector)).to.exist;
      expect(subject.getComputedStyle(feedbackVoteSelector).display).to.not.equal('none');
    });

    xit('renders text', function () {
      const textSelector = `${feedbackVoteSelector} .feedback-text`;
      expect(subject.query(textSelector)).to.exist;
      expect(subject.query(textSelector).textContent.trim())
        .to.equal('offers_hub_feedback_text');
    });

    it('renders "up" and "down" buttons', function () {
      const buttonsUpSelector = `${feedbackVoteSelector} [data-vote="up"]`;
      const buttonsDownSelector = `${feedbackVoteSelector} [data-vote="down"]`;
      expect(subject.query(buttonsUpSelector)).to.exist;
      expect(subject.query(buttonsDownSelector)).to.exist;
    });

    function feedbackReactionTests(reaction) {
      context(`click on "${reaction}" button`, function () {
        beforeEach(function () {
          subject.query(`.feedback-button[data-vote="${reaction}"]`).click();

          return waitFor(function () {
            return subject.messages.find(message => message.message.action === 'resize');
          });
        });

        it('renders feedback comment wrapper', function () {
          expect(subject.query(feedbackCommentSelector)).to.exist;
          expect(subject.getComputedStyle('#feedback-comment-wrapper').display).to.not.equal('none');
        });

        it('renders feedback text area', function () {
          const textareaSelector = `${feedbackCommentSelector} #feedback-textarea`;
          expect(subject.query(textareaSelector)).to.exist;
        });

        it('renders "send feedback" button', function () {
          const buttonSelector = `${feedbackCommentSelector} #submit-feedback`;
          expect(subject.query(buttonSelector)).to.exist;
          expect(subject.query(buttonSelector).textContent.trim())
            .to.equal('offers_hub_feedback_send');
        });

        context('click on "submit feedback"', function () {
          beforeEach(function () {
            subject.query('#submit-feedback').click();

            return waitFor(function () {
              return subject.messages.find(message => message.message.action === 'resize');
            });
          });

          it('"thank you" was rendered', function () {
            expect(subject.query('.feedback-box.thank-you')).to.exist;
            expect(subject.query('.feedback-box.thank-you h2').textContent.trim())
              .to.equal('offers_hub_feedback_thank_you');
            expect(subject.query('.feedback-box.thank-you p').textContent.trim())
              .to.equal('offers_feedback_thank_you');
          });
        });
      });
    }

    feedbackReactionTests('up');
    feedbackReactionTests('down');
  });
});

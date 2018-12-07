import {
  expect,
  waitFor,
} from '../../core/test-helpers';
import Subject from './local-helpers';

context('Offers Hub feedback form tests', function () {
  let subject;
  const feedbackBoxSelector = '.feedback-box';
  const feedbackVoteSelector = '#feedback-vote-wrapper';
  const feedbackCommentSelector = '#feedback-comment-wrapper';
  const target = 'cliqz-offers-cc';

  context('UI', function () {
    before(async function () {
      subject = new Subject();
      await subject.load();
      await subject.pushData(target, {
        noVoucher: true,
      });
      subject.query('.setting').click();
      await waitFor(() =>
        subject.query('.setting-menu').classList.contains('show'));
      subject.query('.setting-menu .feedback').click();
      await waitFor(() =>
        subject.messages.find(message => message.message.action === 'resize'));
    });

    after(function () {
      subject.unload();
    });

    it('renders feedback box', function () {
      expect(subject.query('.overlay')).to.have.class('show');
      expect(subject.getComputedStyle('.overlay').visibility).to.equal('visible');
    });

    context('renders feedback header', function () {
      it('with correct text', function () {
        expect(subject.query(`${feedbackBoxSelector} header`)).to.exist;
        expect(subject.query(`${feedbackBoxSelector} [data-i18n="offers_menu_give_feedback"]`)).to.exist;
        expect(subject.query(`${feedbackBoxSelector} [data-i18n="offers_menu_give_feedback"]`))
          .to.have.text('offers_menu_give_feedback');
      });

      it('with "close" button', function () {
        expect(subject.query(`${feedbackBoxSelector} header button.close`)).to.exist;
      });
    });

    context('feedback vote section', function () {
      it('renders text', function () {
        const textSelector = `${feedbackVoteSelector} .feedback-text`;
        expect(subject.query(textSelector)).to.exist;
        expect(subject.query(textSelector)).to.have.text('offers_feedback_feature');
      });

      it('renders "up" and "down" buttons', function () {
        const buttonsUpSelector = `${feedbackVoteSelector} [data-vote="up"]`;
        const buttonsDownSelector = `${feedbackVoteSelector} [data-vote="down"]`;
        expect(subject.query(buttonsUpSelector)).to.exist;
        expect(subject.query(buttonsDownSelector)).to.exist;
      });
    });

    context('feedback comments section', function () {
      it('renders text', function () {
        const textSelector = `${feedbackCommentSelector} label`;
        expect(subject.query(textSelector)).to.exist;
        expect(subject.query(textSelector)).to.have.text('offers_hub_feedback_comments');
      });

      it('renders textarea', function () {
        const textAreaSelector = `${feedbackCommentSelector} #feedback-textarea`;
        expect(subject.query(textAreaSelector)).to.exist;
        expect(subject.query(textAreaSelector)).to.have.attribute('placeholder');
        expect(subject.query(textAreaSelector).getAttribute('placeholder')).to.equal('Optional');
      });

      it('renders "Submit" button', function () {
        const buttonSelector = `${feedbackCommentSelector} button#submit-feedback`;
        expect(subject.query(buttonSelector)).to.exist;
        expect(subject.query(buttonSelector)).to.have.text('offers_hub_feedback_send');
      });
    });
  });

  context('interaction', function () {
    beforeEach(async function () {
      subject = new Subject();
      await subject.load();
      await subject.pushData(target, {
        noVoucher: true,
      });
      subject.query('.setting').click();
      await waitFor(() =>
        subject.query('.setting-menu').classList.contains('show'));
      subject.query('.setting-menu .feedback').click();
      await waitFor(() =>
        subject.messages.find(message => message.message.action === 'resize'));
    });

    afterEach(function () {
      subject.unload();
    });

    function feedbackReactionTests(reaction) {
      context(`click on "${reaction}" button`, function () {
        beforeEach(async function () {
          subject.query(`.feedback-button[data-vote="${reaction}"]`).click();

          await waitFor(() =>
            subject.messages.find(message => message.message.action === 'sendUserFeedback'));
        });

        it('the value of sent message is correct', function () {
          const sendUserFeedbackMessage = subject.messages.find(message => message.message.action === 'sendUserFeedback');
          expect(sendUserFeedbackMessage.message.data).to.have.keys(['target', 'vote', 'comments']);
          expect(sendUserFeedbackMessage.message.data.vote).to.equal(reaction);
        });

        context('click on "send feedback"', function () {
          beforeEach(async function () {
            subject.query('#submit-feedback').click();

            await waitFor(() =>
              subject.messages.find(message => message.message.action === 'sendUserFeedback'));
          });

          it('the vote of sent message is correct', function () {
            const sendUserFeedbackMessage = subject.messages.find(message => message.message.action === 'sendUserFeedback');
            expect(sendUserFeedbackMessage.message.data).to.have.keys(['target', 'vote', 'comments']);
            expect(sendUserFeedbackMessage.message.data.vote).to.equal(reaction);
          });

          it('"thank you" was rendered', function () {
            expect(subject.query('.feedback-box.thank-you')).to.exist;
            expect(subject.query('.feedback-box.thank-you h2')).to.have.text('offers_hub_feedback_thank_you');
            expect(subject.query('.feedback-box.thank-you p')).to.have.text('offers_feedback_thank_you');
          });
        });
      });
    }

    feedbackReactionTests('up');
    feedbackReactionTests('down');

    it('"close" button works', async function () {
      subject.query('.feedback-box .close').click();
      await waitFor(() => expect(subject.query('.overlay')).to.not.have.class('show'));
    });

    context('add comment and submit', function () {
      const comment = 'Set by automated test';

      beforeEach(async function () {
        subject.query('#feedback-textarea').value = comment;
        subject.query('#submit-feedback').click();

        await waitFor(() =>
          subject.messages.find(message => message.message.action === 'sendUserFeedback'));
      });

      it('the comments of sent message is correct', function () {
        const sendUserFeedbackMessage = subject.messages.find(message => message.message.action === 'sendUserFeedback');
        expect(sendUserFeedbackMessage.message.data).to.have.keys(['target', 'comments']);
        expect(sendUserFeedbackMessage.message.data.comments).to.equal(comment);
      });

      it('"thank you" was rendered', function () {
        expect(subject.query('.feedback-box.thank-you')).to.exist;
        expect(subject.query('.feedback-box.thank-you h2')).to.have.text('offers_hub_feedback_thank_you');
        expect(subject.query('.feedback-box.thank-you p')).to.have.text('offers_feedback_thank_you');
      });
    });
  });
});

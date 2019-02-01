/* eslint no-await-in-loop: "off" */

import { app } from '../../core/integration/helpers';
import OffersConfigs from '../../../offers-v2/offers_configs';
import logger from '../../../offers-v2/common/offers_v2_logger';
import { getHpnTimeStamp, getMinuteTimestamp } from '../../../offers-v2/signals/utils';

export default function () {
  if (app.config.settings.offersInfraTests !== true) {
    return;
  }

  // Cliqz_Infra_Testing

  const fakeOfferID = 'Cliqz_Infra_Testing-fake-offer';
  const fakeCampaignID = 'Cliqz_Infra_Testing';

  describe('send fake signals to backend through hpn', function () {
    const offers = app.modules['offers-v2'].background;
    const createdTS = Date.now();

    const sendHPNv1Signal = signal =>
    // When we send to SIGNALS_HPN_BE_ADDR using offers module sender,
    // the request gets hijacked by HPN. When we use just the regular httpPost,
    // the request isn't hijacked.

      new Promise((resolve, reject) => {
        offers.signalsHandler.sender.httpPost(
          OffersConfigs.SIGNALS_HPN_BE_ADDR,
          () => {
            logger.info('hpn_signals: signal sent');
            resolve();
          },
          JSON.stringify(signal),
          (err) => {
            logger.error('hpn_signals: error sending signal: ', err);
            reject(err);
          }
        );
      });

    const generateCampaignSignal = (ucid, events, seq) =>
      ({
        action: 'offers-signal',
        signal_id: 'integration-test',
        timestamp: getHpnTimeStamp(),
        payload: {
          v: OffersConfigs.SIGNALS_VERSION,
          ex_v: '99.99.99',
          is_developer: false,
          gid: {},
          type: 'campaign',
          sent_ts: getMinuteTimestamp(),
          data: {
            c_id: fakeCampaignID,
            c_data: {
              seq: seq,
              created_ts: createdTS,
              ucid: ucid,
              offers: [
                {
                  offer_id: fakeOfferID,
                  created_ts: createdTS,
                  offer_data: events
                }
              ]
            }
          }
        }
      });

    it('hpn_v1', async function () {
      console.log('hpn_signals: starting the test');

      // We'll run this test a a few times a day via jenkins, and we'll have a new ucid on each run.
      // This way, our number of users in this campaign
      // will be equal to the number of test launches.
      const ucid = `${getMinuteTimestamp().toString()}-9999-9999-9999-999999999990`;
      let seq = 9000;
      const events = [{
        origin: 'trigger',
        origin_data: {
          offer_triggered: 1,
          offer_pushed: 1
        }
      }];
      await sendHPNv1Signal(generateCampaignSignal(ucid, events, seq += 1));

      events.push({
        origin: 'panel',
        origin_data: {
          offer_shown: 1,
          offer_dsp_session: 1
        }
      });
      for (let i = 0; i < 9; i += 1) {
        events[1].origin_data.offer_shown += 1;
        await sendHPNv1Signal(generateCampaignSignal(ucid, events, seq += 1));
      }

      events[1].origin_data.code_copied = 1;
      await sendHPNv1Signal(generateCampaignSignal(ucid, events, seq += 1));

      events[1].origin_data.offer_ca_action = 1;
      await sendHPNv1Signal(generateCampaignSignal(ucid, events, seq += 1));

      events[0].origin_data.landing = 1;
      await sendHPNv1Signal(generateCampaignSignal(ucid, events, seq += 1));

      for (let i = 0; i < 5; i += 1) {
        events[0].origin_data.page_imp = (events[0].origin_data.page_imp + 1) || 1;
        await sendHPNv1Signal(generateCampaignSignal(ucid, events, seq += 1));
      }

      events[0].origin_data.cart = 1;
      await sendHPNv1Signal(generateCampaignSignal(ucid, events, seq += 1));

      logger.info('hpn_signals: all done');
    });
  });
}

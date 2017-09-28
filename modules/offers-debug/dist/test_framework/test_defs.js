var TEST_DATA = {
  test_groups: [
    {
      // Prerequisite: PANEL must be enabled. To do so, please, set your A/B test group to :
      name: 'panel-item',
      desc: 'Checks if offer is being triggered and shown in the hub',
      cases: [
        // offer added and shown for the first time
        {
          name: 'open close offer',
          desc: 'recieve an offer for an explicit match',
          status: 'pending',
          expected_signals:
          [
            { cid: 'qa_campaign', oid: 'qa_trigger_ID', origID:'processor', sid: 'offer_pushed', min_expected_count: 1 },
            { cid: 'qa_campaign', oid: 'qa_trigger_ID', origID:'browser-panel', sid: 'offer_shown', min_expected_count: 1 , max_expected_count:1},
            { cid: 'qa_campaign', oid: 'qa_trigger_ID', origID:'browser-panel', sid: 'offer_dsp_session', min_expected_count: 1 },
            { cid: 'qa_campaign', oid: 'qa_trigger_ID', origID:'processor', sid: 'offer_triggered', min_expected_count: 1 },
            { cid: 'qa_campaign', oid: 'qa_trigger_ID', origID:'browser-panel', sid: 'offer_closed', min_expected_count: 1, max_expected_count:1 },
          ]
        },
        // switch tabs
        // Preconditions : offer is visible
        {
          name: 'show - hide',
          desc: 'tests implemewtation specific behaviour: User must havce a displayed offer, user must switch to a new or existing tab and get back',
          status: 'pending',
          expected_signals:
          [
            { cid: 'qa_campaign', oid: 'qa_trigger_ID', origID:'browser-panel', sid: 'offer_shown', min_expected_count: 2 },
            { cid: 'qa_campaign', oid: 'qa_trigger_ID', origID:'browser-panel', sid: 'offer_dsp_session', min_expected_count: 1, max_expected_count: 1 },
            { cid: 'qa_campaign', oid: 'qa_trigger_ID', origID:'processor', sid: 'offer_triggered', min_expected_count: 1 },
            { cid: 'qa_campaign', oid: 'qa_trigger_ID', origID:'processor', sid: 'offer_pushed', min_expected_count: 1 },
          ]
        },
        // call to action button pressed
        // Preconditions : offer is visible
        {
          name: 'call to action',
          desc: 'user clicks call to action button on the offer',
          status: 'pending',
          expected_signals:
          [
            { cid: 'qa_campaign', oid: 'qa_trigger_ID', origID:'processor', sid: 'offer_triggered', min_expected_count: 1},
            { cid: 'qa_campaign', oid: 'qa_trigger_ID', origID:'processor', sid: 'offer_pushed', min_expected_count: 1},
            { cid: 'qa_campaign', oid: 'qa_trigger_ID', origID:'browser-panel', sid: 'offer_dsp_session', min_expected_count: 1},
            { cid: 'qa_campaign', oid: 'qa_trigger_ID', origID:'browser-panel', sid: 'offer_shown', min_expected_count: 1},
            { cid: 'qa_campaign', oid: 'qa_trigger_ID', origID:'browser-panel', sid: 'offer_ca_action', min_expected_count: 1}
          ]
        },
        {
          name: 'more information',
          desc: 'tests user requesting more information',
          status: 'pending',
          expected_signals:
          [

            { cid: 'qa_campaign', oid: 'qa_trigger_ID', origID:'processor', sid: 'offer_triggered', min_expected_count: 1},
            { cid: 'qa_campaign', oid: 'qa_trigger_ID', origID:'processor', sid: 'offer_pushed', min_expected_count: 1},
            { cid: 'qa_campaign', oid: 'qa_trigger_ID', origID:'browser-panel', sid: 'offer_dsp_session', min_expected_count: 1},
            { cid: 'qa_campaign', oid: 'qa_trigger_ID', origID:'browser-panel', sid: 'offer_shown', min_expected_count: 1}
          ],
          expected_actions: [
            { origID: 'browser-panel', aid: 'more_about_cliqz', min_expected_count: 1, max_expected_count: 1 }
          ]
        },
        {
          name: 'copy the code',
          desc: 'tests code copy singal',
          status: 'pending',
          expected_signals:
          [
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'processor', sid: 'offer_triggered', min_expected_count: 1},
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'processor', sid: 'offer_pushed', min_expected_count: 1},
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'browser-panel', sid: 'offer_dsp_session', min_expected_count: 1},
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'browser-panel', sid: 'offer_shown', min_expected_count: 1},
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'browser-panel', sid: 'code_copied', min_expected_count: 1 }
          ]
        },
        // precondition : use qa_trigger_1_filter
        {
          name: 'filter rules',
          desc: 'test that filtering rules are working',
          status: 'pending',
          expected_signals:
          [
            { cid: 'qa_campaign', oid: 'qa_trigger_ID_filter', origID:'browser-panel', sid: 'offer_shown', min_expected_count: 2 },
            { cid: 'qa_campaign', oid: 'qa_trigger_ID_filter', origID:'browser-panel', sid: 'offer_dsp_session',min_expected_count:1, max_expected_count: 2 },
            { cid: 'qa_campaign', oid: 'qa_trigger_ID_filter', origID:'processor', sid: 'offer_triggered', min_expected_count:1, max_expected_count: 3 },
            { cid: 'qa_campaign', oid: 'qa_trigger_ID_filter', origID:'processor', sid: 'offer_pushed', min_expected_count:1, max_expected_count: 2 },
            { cid: 'qa_campaign', oid: 'qa_trigger_ID_filter', origID:'processor', sid: 'offer_filtered', min_expected_count:1,max_expected_count: 2 },
          ]
        },
        {
          // will reset offers DB
          reset_offers_db: true,
          name: 'dsp consistency',
          desc: 'check if we correctly increment dsp counter',
          status: 'pending',
          expected_signals: [
            { cid: 'qa_campaign', oid: 'qa_trigger_dsp_ID_filter', origID:'processor', sid: 'offer_triggered', min_expected_count: 1 },
            { cid: 'qa_campaign', oid: 'qa_trigger_dsp_ID_filter', origID:'processor', sid: 'offer_pushed', min_expected_count: 1 },
            { cid: 'qa_campaign', oid: 'qa_trigger_dsp_ID_filter', origID:'browser-panel', sid: 'offer_dsp_session',min_expected_count:1, max_expected_count: 1 },
            { cid: 'qa_campaign', oid: 'qa_trigger_dsp_ID_filter', origID:'browser-panel', sid: 'offer_shown', min_expected_count: 1 },
          ],
        },
        {
          // will reset offers DB
          reset_offers_db: true,
          name: 'timeout',
          desc: 'check timeout signal',
          status: 'pending',
          expected_signals: [
            { cid: 'qa_campaign', oid: 'qa_trigger_timeout_filter_ID', origID:'processor', sid: 'offer_triggered', min_expected_count: 1, max_expected_count: 3 },
            { cid: 'qa_campaign', oid: 'qa_trigger_timeout_filter_ID', origID:'processor', sid: 'offer_pushed', min_expected_count: 1, max_expected_count: 2 },
            { cid: 'qa_campaign', oid: 'qa_trigger_timeout_filter_ID', origID:'browser-panel', sid: 'offer_dsp_session', min_expected_count: 1, max_expected_count: 1 },
            { cid: 'qa_campaign', oid: 'qa_trigger_timeout_filter_ID', origID:'browser-panel', sid: 'offer_shown', min_expected_count: 1, max_expected_count: 2 },
            { cid: 'qa_campaign', oid: 'qa_trigger_timeout_filter_ID', origID:'browser-panel', sid: 'offer_timeout', min_expected_count: 1, max_expected_count: 1 }
          ]
        },
      ]
    },


    // Prerequisite: HUB must be enabled. To do so, please, set your A/B test group to :
    {
      name: 'hub',
      desc: 'Checks signals and actions for HUB',
      cases: [
        {
          // will reset offers DB
          reset_offers_db: true,
          name: 'tooltip shown',
          desc: 'user sees the tooltip',
          status: 'pending',
          expected_signals: [
            { cid: 'qa_campaign', oid: 'qa_trigger_ID', origID:'processor', sid: 'offer_triggered', min_expected_count: 1 },
            { cid: 'qa_campaign', oid: 'qa_trigger_ID', origID:'processor', sid: 'offer_pushed', min_expected_count: 1 },
            { cid: 'qa_campaign', oid: 'qa_trigger_ID', origID:'offers-cc-tooltip', sid: 'offer_dsp_session', max_expected_count: 0 },
            { cid: 'qa_campaign', oid: 'qa_trigger_ID', origID:'offers-cc-tooltip', sid: 'offer_shown', max_expected_count: 0}
          ],
          expected_actions: [
            { origID: 'offers-cc-tooltip', aid: 'tooltip_shown', min_expected_count: 1, max_expected_count: 2 }
          ]
        },
        {
          // will reset offers DB
          reset_offers_db: true,
          name: 'tooltip shown and clicked',
          desc: 'user sees the tooltip',
          status: 'pending',
          expected_signals: [
            { cid: 'qa_campaign', oid: 'qa_trigger_ID', origID:'processor', sid: 'offer_triggered', min_expected_count: 1 },
            { cid: 'qa_campaign', oid: 'qa_trigger_ID', origID:'processor', sid: 'offer_pushed', min_expected_count: 1},
            { cid: 'qa_campaign', oid: 'qa_trigger_ID', origID:'offers-cc-tooltip', sid: 'offer_dsp_session', min_expected_count: 1 },
            { cid: 'qa_campaign', oid: 'qa_trigger_ID', origID:'offers-cc-tooltip', sid: 'offer_shown', min_expected_count: 1}
          ],
          expected_actions: [
            { origID: 'offers-cc-tooltip', aid: 'tooltip_shown', min_expected_count: 1, max_expected_count: 2 },
            { origID: 'offers-cc-tooltip', aid: 'tooltip_clicked', min_expected_count: 1, max_expected_count: 2 },
            { origID: 'offers-cc-tooltip', aid: 'hub_pop_up', min_expected_count: 1, max_expected_count: 2 },
            { origID: 'offers-cc-tooltip', aid: 'hub_closed', min_expected_count: 1, max_expected_count: 2 }
          ]
        },
        {
          name: 'copy code',
          desc: 'tests code copy singal',
          status: 'pending',
          expected_signals:
          [
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'processor', sid: 'offer_triggered', min_expected_count: 1},
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'processor', sid: 'offer_pushed', min_expected_count: 1},
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'offers-cc-tooltip', sid: 'offer_dsp_session', min_expected_count: 1},
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'offers-cc-tooltip', sid: 'offer_shown', min_expected_count: 1},
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'offers-cc-tooltip', sid: 'code_copied', min_expected_count: 1 }
          ]
        },
        {
          name: 'call to action',
          desc: 'tests call-to-action button',
          status: 'pending',
          expected_signals:
          [
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'processor', sid: 'offer_triggered', min_expected_count: 1},
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'processor', sid: 'offer_pushed', min_expected_count: 1},
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'offers-cc-tooltip', sid: 'offer_dsp_session', min_expected_count: 1},
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'offers-cc-tooltip', sid: 'offer_shown', min_expected_count: 1},
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'offers-cc-tooltip', sid: 'offer_ca_action', min_expected_count: 1 }
          ]
        },
        {
          name: 'remove no feedback',
          desc: 'tests offer_removed signals',
          status: 'pending',
          expected_signals:
          [
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'processor', sid: 'offer_triggered', min_expected_count: 1},
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'processor', sid: 'offer_pushed', min_expected_count: 1},
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'offers-cc-tooltip', sid: 'offer_dsp_session', min_expected_count: 1},
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'offers-cc-tooltip', sid: 'offer_shown', min_expected_count: 1},
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'offers-cc-tooltip', sid: 'feedback_no', min_expected_count: 1 },
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'offers-cc-tooltip', sid: 'offer_removed', min_expected_count: 1 },
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'processor', sid: 'offer_db_removed', min_expected_count: 1 }
          ]
        },
        {
          name: 'remove option 1',
          desc: 'tests offer_removed signals',
          status: 'pending',
          expected_signals:
          [
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'processor', sid: 'offer_triggered', min_expected_count: 1},
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'processor', sid: 'offer_pushed', min_expected_count: 1},
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'offers-cc-tooltip', sid: 'offer_dsp_session', min_expected_count: 1},
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'offers-cc-tooltip', sid: 'offer_shown', min_expected_count: 1},
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'offers-cc-tooltip', sid: 'feedback_option1', min_expected_count: 1 },
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'offers-cc-tooltip', sid: 'offer_removed', min_expected_count: 1 },
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'processor', sid: 'offer_db_removed', min_expected_count: 1 }
          ]
        },
        {
          name: 'remove option 2',
          desc: 'tests offer_removed signals',
          status: 'pending',
          expected_signals:
          [
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'processor', sid: 'offer_triggered', min_expected_count: 1},
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'processor', sid: 'offer_pushed', min_expected_count: 1},
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'offers-cc-tooltip', sid: 'offer_dsp_session', min_expected_count: 1},
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'offers-cc-tooltip', sid: 'offer_shown', min_expected_count: 1},
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'offers-cc-tooltip', sid: 'feedback_option2', min_expected_count: 1 },
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'offers-cc-tooltip', sid: 'offer_removed', min_expected_count: 1 },
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'processor', sid: 'offer_db_removed', min_expected_count: 1 }
          ]
        },
        {
          name: 'remove option 3',
          desc: 'tests offer_removed signals',
          status: 'pending',
          expected_signals:
          [
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'processor', sid: 'offer_triggered', min_expected_count: 1},
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'processor', sid: 'offer_pushed', min_expected_count: 1},
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'offers-cc-tooltip', sid: 'offer_dsp_session', min_expected_count: 1},
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'offers-cc-tooltip', sid: 'offer_shown', min_expected_count: 1},
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'offers-cc-tooltip', sid: 'feedback_option3', min_expected_count: 1 },
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'offers-cc-tooltip', sid: 'offer_removed', min_expected_count: 1 },
            { cid: 'qa_campaign', oid: 'qa_trigger_code_ID', origID:'processor', sid: 'offer_db_removed', min_expected_count: 1 }
          ]
        },
        {
          name: 'filtered signal',
          desc: 'filtering events works and signals are correct',
          status: 'pending',
          expected_signals:
          [
            // processor
            { cid: 'qa_campaign', oid: 'qa_trigger_1_filter_shown_3', origID:'processor', sid: 'offer_triggered', min_expected_count: 3, max_expected_count: 3 },
            { cid: 'qa_campaign', oid: 'qa_trigger_1_filter_shown_3', origID:'processor', sid: 'offer_pushed', min_expected_count: 2, max_expected_count: 2 },
            { cid: 'qa_campaign', oid: 'qa_trigger_1_filter_shown_3', origID:'processor', sid: 'offer_filtered', min_expected_count: 1, max_expected_count: 1 },
            // real estate
            { cid: 'qa_campaign', oid: 'qa_trigger_1_filter_shown_3', origID:'offers-cc-tooltip', sid: 'offer_shown', min_expected_count: 2, max_expected_count: 2 },
            { cid: 'qa_campaign', oid: 'qa_trigger_1_filter_shown_3', origID:'offers-cc-tooltip', sid: 'offer_dsp_session', min_expected_count: 2, max_expected_count: 2 }
          ],
          expected_actions: [
            { origID: 'offers-cc-tooltip', aid: 'tooltip_shown', min_expected_count: 2, max_expected_count: 4 },
            { origID: 'offers-cc-tooltip', aid: 'tooltip_clicked', min_expected_count: 2, max_expected_count: 4 },
            { origID: 'offers-cc-tooltip', aid: 'hub_pop_up', min_expected_count: 2, max_expected_count: 4 },
            { origID: 'offers-cc-tooltip', aid: 'hub_closed', min_expected_count: 2, max_expected_count: 4 }
          ]
        }
      ]
    },
    {
      name: 'monitoring-signals',
      desc: 'Checks monitoring signals such as "landing" or "registration".',
      cases: [
        {
          name: 'single conversion',
          desc: 'tests uniqueness of conversion/registration signal',
          status: 'pending',
          expected_signals: [
            { cid: 'qa_campaign', oid: 'qa_pre_conv1', origID:'processor', sid: 'offer_triggered', min_expected_count: 1 },
            { cid: 'qa_campaign', oid: 'qa_pre_conv1', origID:'processor', sid: 'offer_pushed', min_expected_count: 1 },
            { cid: 'qa_campaign', oid: 'qa_pre_conv2', origID:'processor', sid: 'offer_triggered', min_expected_count: 1 },
            { cid: 'qa_campaign', oid: 'qa_pre_conv2', origID:'processor', sid: 'offer_pushed', min_expected_count: 1 },
            { cid: 'qa_campaign', oid: 'qa_pre_conv1', origID:'trigger', sid: 'registration', max_expected_count: 0},
            { cid: 'qa_campaign', oid: 'qa_pre_conv2', origID:'trigger', sid: 'registration', min_expected_count: 1, max_expected_count: 1}
          ]
        },
        {
          name: 'page impressions',
          desc: 'multiple pages within a website should count, except refreshes.',
          status: 'pending',
          expected_signals: [
            { cid: 'qa_campaign', oid: 'qa_pre_conv2', origID:'processor', sid: 'offer_triggered', min_expected_count: 1 },
            { cid: 'qa_campaign', oid: 'qa_pre_conv2', origID:'processor', sid: 'offer_pushed', min_expected_count: 1 },
            { cid: 'qa_campaign', oid: 'qa_pre_conv2', origID:'trigger', sid: 'page_imp', min_expected_count: 3}
          ]
        },
      ]
    },

    {
      name: 'Dropdown',
      desc: 'Checks Dropdown signals',
      cases: [
        {
          name: 'shown no-action',
          desc: 'an offer_shown signal should be sent on url-bar defocus if no result/action is taken',
          status: 'pending',
          expected_signals: [
            { cid: 'HCL1', oid: 'HCL1Dd1', origID:'dropdown', sid: 'offer_triggered', min_expected_count: 1, max_expected_count: 1},
            { cid: 'HCL1', oid: 'HCL1Dd1', origID:'dropdown', sid: 'offer_pushed', min_expected_count: 1, max_expected_count: 1},
            { cid: 'HCL1', oid: 'HCL1Dd1', origID:'dropdown', sid: 'offer_dsp_session', min_expected_count: 1, max_expected_count: 1},
            { cid: 'HCL1', oid: 'HCL1Dd1', origID:'dropdown', sid: 'offer_shown', min_expected_count: 1, max_expected_count: 1}
          ]
        },
        {
          name: 'shown on result',
          desc: 'an offer_shown signal should be sent on url-bar defocus when selecting a result (not the offer)',
          status: 'pending',
          expected_signals: [
            { cid: 'HCL1', oid: 'HCL1Dd1', origID:'dropdown', sid: 'offer_triggered', min_expected_count: 1, max_expected_count: 1},
            { cid: 'HCL1', oid: 'HCL1Dd1', origID:'dropdown', sid: 'offer_pushed', min_expected_count: 1, max_expected_count: 1},
            { cid: 'HCL1', oid: 'HCL1Dd1', origID:'dropdown', sid: 'offer_dsp_session', min_expected_count: 1, max_expected_count: 1},
            { cid: 'HCL1', oid: 'HCL1Dd1', origID:'dropdown', sid: 'offer_shown', min_expected_count: 1, max_expected_count: 1}
          ]
        },
        {
          name: 'shown on enter',
          desc: 'an offer_shown signal should be send on url-bar defocus when pressing Enter to use alternative search engine',
          status: 'pending',
          expected_signals: [
            { cid: 'HCL1', oid: 'HCL1Dd1', origID:'dropdown', sid: 'offer_triggered', min_expected_count: 1, max_expected_count: 1},
            { cid: 'HCL1', oid: 'HCL1Dd1', origID:'dropdown', sid: 'offer_pushed', min_expected_count: 1, max_expected_count: 1},
            { cid: 'HCL1', oid: 'HCL1Dd1', origID:'dropdown', sid: 'offer_dsp_session', min_expected_count: 1, max_expected_count: 1},
            { cid: 'HCL1', oid: 'HCL1Dd1', origID:'dropdown', sid: 'offer_shown', min_expected_count: 1, max_expected_count: 1}
          ]
        },
        {
          name: 'shown and click',
          desc: 'check that all signals are sent when selecting an offer result',
          status: 'pending',
          expected_signals: [
            { cid: 'HCL1', oid: 'HCL1Dd1', origID:'dropdown', sid: 'offer_triggered', min_expected_count: 1, max_expected_count: 1},
            { cid: 'HCL1', oid: 'HCL1Dd1', origID:'dropdown', sid: 'offer_pushed', min_expected_count: 1, max_expected_count: 1},
            { cid: 'HCL1', oid: 'HCL1Dd1', origID:'dropdown', sid: 'offer_shown', min_expected_count: 1, max_expected_count: 1},
            { cid: 'HCL1', oid: 'HCL1Dd1', origID:'dropdown', sid: 'offer_dsp_session', min_expected_count: 1, max_expected_count: 1},
            { cid: 'HCL1', oid: 'HCL1Dd1', origID:'dropdown', sid: 'offer_ca_action', min_expected_count: 1, max_expected_count: 1}
          ]
        },
      ]
    },

    // Cliqz-tab
    {
      name: 'Cliqz-tab',
      desc: 'Checks Cliqz-tab signals',
      cases: [
        {
          name: 'basic offer shown',
          desc: 'An offer is displayed properly and the signals are properly sent',
          status: 'pending',
          expected_signals: [
            { cid: 'cliqz-tab-test-cid', oid: 'cliqz-tab-test', origID:'processor', sid: 'offer_triggered', min_expected_count: 1, max_expected_count: 1},
            { cid: 'cliqz-tab-test-cid', oid: 'cliqz-tab-test', origID:'processor', sid: 'offer_pushed', min_expected_count: 1, max_expected_count: 1},
            { cid: 'cliqz-tab-test-cid', oid: 'cliqz-tab-test', origID:'cliqz-tab', sid: 'offer_dsp_session', min_expected_count: 1, max_expected_count: 1},
            { cid: 'cliqz-tab-test-cid', oid: 'cliqz-tab-test', origID:'cliqz-tab', sid: 'offer_shown', min_expected_count: 1, max_expected_count: 1}
          ]
        },
        // scrolling works for offer shown
        {
          name: 'multiple shown',
          desc: 'The same offer is shown multiple times but one display session',
          status: 'pending',
          expected_signals: [
            { cid: 'cliqz-tab-test-cid', oid: 'cliqz-tab-test', origID:'processor', sid: 'offer_triggered', min_expected_count: 1, max_expected_count: 1},
            { cid: 'cliqz-tab-test-cid', oid: 'cliqz-tab-test', origID:'processor', sid: 'offer_pushed', min_expected_count: 1, max_expected_count: 1},
            { cid: 'cliqz-tab-test-cid', oid: 'cliqz-tab-test', origID:'cliqz-tab', sid: 'offer_dsp_session', min_expected_count: 1, max_expected_count: 1},
            { cid: 'cliqz-tab-test-cid', oid: 'cliqz-tab-test', origID:'cliqz-tab', sid: 'offer_shown', min_expected_count: 2}
          ]
        },
        // for each cliqz-tab opened we get a new session
        {
          name: 'multiple sessions',
          desc: 'Multiple sessions on different cliqztab',
          status: 'pending',
          expected_signals: [
            { cid: 'cliqz-tab-test-cid', oid: 'cliqz-tab-test', origID:'processor', sid: 'offer_triggered', min_expected_count: 1, max_expected_count: 1},
            { cid: 'cliqz-tab-test-cid', oid: 'cliqz-tab-test', origID:'processor', sid: 'offer_pushed', min_expected_count: 1, max_expected_count: 1},
            { cid: 'cliqz-tab-test-cid', oid: 'cliqz-tab-test', origID:'cliqz-tab', sid: 'offer_dsp_session', min_expected_count: 2, max_expected_count: 2},
            { cid: 'cliqz-tab-test-cid', oid: 'cliqz-tab-test', origID:'cliqz-tab', sid: 'offer_shown', min_expected_count: 2, max_expected_count: 2}
          ]
        },
        // removing an offer works (get, remove, open again no offer is shown)
        {
          name: 'remove offer',
          desc: 'Removing an offer works',
          status: 'pending',
          expected_signals: [
            { cid: 'cliqz-tab-test-cid', oid: 'cliqz-tab-test', origID:'processor', sid: 'offer_triggered', min_expected_count: 1, max_expected_count: 1},
            { cid: 'cliqz-tab-test-cid', oid: 'cliqz-tab-test', origID:'processor', sid: 'offer_pushed', min_expected_count: 1, max_expected_count: 1},
            { cid: 'cliqz-tab-test-cid', oid: 'cliqz-tab-test', origID:'cliqz-tab', sid: 'offer_dsp_session', min_expected_count: 1, max_expected_count: 1},
            { cid: 'cliqz-tab-test-cid', oid: 'cliqz-tab-test', origID:'cliqz-tab', sid: 'offer_shown', min_expected_count: 1, max_expected_count: 1},
            { cid: 'cliqz-tab-test-cid', oid: 'cliqz-tab-test', origID:'processor', sid: 'offer_db_removed', min_expected_count: 1, max_expected_count: 1},
            { cid: 'cliqz-tab-test-cid', oid: 'cliqz-tab-test', origID:'cliqz-tab', sid: 'offer_removed', min_expected_count: 1, max_expected_count: 1}
          ]
        },
        // mouse over works and code copied works
        {
          name: 'extra signals',
          desc: 'Mouse over and code copied works',
          status: 'pending',
          expected_signals: [
            { cid: 'cliqz-tab-test-cid', oid: 'cliqz-tab-test', origID:'processor', sid: 'offer_triggered', min_expected_count: 1, max_expected_count: 1},
            { cid: 'cliqz-tab-test-cid', oid: 'cliqz-tab-test', origID:'processor', sid: 'offer_pushed', min_expected_count: 1, max_expected_count: 1},
            { cid: 'cliqz-tab-test-cid', oid: 'cliqz-tab-test', origID:'cliqz-tab', sid: 'offer_dsp_session', min_expected_count: 1, max_expected_count: 1},
            { cid: 'cliqz-tab-test-cid', oid: 'cliqz-tab-test', origID:'cliqz-tab', sid: 'offer_shown', min_expected_count: 1, max_expected_count: 1},
            { cid: 'cliqz-tab-test-cid', oid: 'cliqz-tab-test', origID:'cliqz-tab', sid: 'code_copied', min_expected_count: 1, max_expected_count: 1},
            { cid: 'cliqz-tab-test-cid', oid: 'cliqz-tab-test', origID:'cliqz-tab', sid: 'offer_more_info', min_expected_count: 1, max_expected_count: 1}
          ]
        },
        {
          name: 'one tab one session',
          desc: 'If we switch tabs the number of sessions should keep for the same cliqz-tab',
          status: 'pending',
          expected_signals: [
            { cid: 'cliqz-tab-test-cid', oid: 'cliqz-tab-test', origID:'processor', sid: 'offer_triggered', min_expected_count: 1, max_expected_count: 1},
            { cid: 'cliqz-tab-test-cid', oid: 'cliqz-tab-test', origID:'processor', sid: 'offer_pushed', min_expected_count: 1, max_expected_count: 1},
            { cid: 'cliqz-tab-test-cid', oid: 'cliqz-tab-test', origID:'cliqz-tab', sid: 'offer_dsp_session', min_expected_count: 1, max_expected_count: 1},
            { cid: 'cliqz-tab-test-cid', oid: 'cliqz-tab-test', origID:'cliqz-tab', sid: 'offer_shown', min_expected_count: 1}
          ]
        }
      ]
    },
  ]
}

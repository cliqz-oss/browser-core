export default function initialCategories() {
  return [
    {
      name: 'tempcat_mirapodo_18%_box_instyle_TG1',
      timeRangeSecs: 900,
      patterns: [
        'onboarding/instyle$domain=myoffrz.com,xmlhttprequest'
      ],
      revHash: 'e4dde04b3a',
      activationData: {
        activationTimeSecs: 86400,
        args: {
          totNumHits: 1
        },
        func: 'simpleCount'
      },
      user_group: 0
    },
    {
      name: 'tempcat_mirapodo_18%_freundin _TG1',
      timeRangeSecs: 900,
      patterns: [
        'onboarding/freundin$domain=myoffrz.com,xmlhttprequest'
      ],
      revHash: '5d5494bdc4',
      activationData: {
        activationTimeSecs: 86400,
        args: {
          totNumHits: 1
        },
        func: 'simpleCount'
      },
      user_group: 0
    }
  ];
}

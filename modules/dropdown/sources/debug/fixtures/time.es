export default {
  'time': {
    query: 'time berlin',
    results: [
      {
         "title":"Worldtime",
         "url":"http://worldtime.io/current/WzUyLjUxNjcsIDEzLjRdfDEzLjR8NTIuNTE2Nw%3D%3D",
         "description":"",
         "originalUrl":"http://worldtime.io/current/WzUyLjUxNjcsIDEzLjRdfDEzLjR8NTIuNTE2Nw%3D%3D",
         "type":"cliqz-extra",
         "text":"time berlin",
         "data":{
            "extra":{
               "answer":"11:12",
               "expression":"Freitag - 1 September 2017",
               "ez_type":"time",
               "is_calculus":true,
               "line3":"Central European Summer Time (UTC/GMT +2:00)",
               "location":"Berlin",
               "mapped_location":"Berlin, Deutschland",
               "meta":{
                  "lazyRH_":"0.0020489692688"
               },
               "prefix_answer":"",
               "support_copy_ans":null
            },
            "friendlyUrl":"worldtime.io/current/wzuyljuxnjcsidezljrdfdezljr8ntiunte2nw%3d%3d",
            "subType":{
               "class":"EntityTime",
               "trigger_method":"rh_query",
               "ez":"deprecated",
               "i":0,
               "cs":0
            },
            "template":"calculator",
            "kind":[
               "X|{\"class\":\"EntityTime\",\"trigger_method\":\"rh_query\",\"ez\":\"deprecated\",\"i\":0,\"cs\":0}"
            ]
         },
         "maxNumberOfSlots":3
      },
      {
        template: 'result',
        title: 'Spielen - Kostenlose Spiele Spielen',
        url: "http://www.royalgames.com/Murphy's_law",
        description: 'Kostenlose Spiele spielen, Kartenspiele, Puzzlespiele, Wortspiele, Actionspiele, Brettspiele, Sportspiele, Denkspiele, Strategiespiele und Flashspiele bei Royalgames.com.',
        data: {},
      }
    ]
  }
};

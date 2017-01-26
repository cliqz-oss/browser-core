import autocomplete from "autocomplete/autocomplete";
import { utils } from "core/cliqz";
import { isFirefox } from "core/platform";

export default class CliqzSpellCheck {
    constructor() {
      this.spellCorrectionDict = {};
      this.resetState();
      if (isFirefox && utils.getPref("backend_country", "") == "de" && Object.keys(this.spellCorrectionDict).length == 0) {
          utils.log('loading dict', 'spellcorr');
          utils.loadResource('chrome://cliqz/content/spell_check.list', CliqzSpellCheck.loadRecords);
      }
    }
    resetState() {
      this.state = {
            'on': false,
            'correctBack': {},
            'override': false,
            'pushed': null,
            'userConfirmed': false,
            'searchTerms': []
        }
    }
    check(q) {
        var words = q.split(" ");
        var correctBack = {}
        for (var i = 0; i < words.length; i++) {
            if (words[i] == "") continue;
            if (this.spellCorrectionDict.hasOwnProperty(words[i])) {
                var correct = this.spellCorrectionDict[words[i]];
                if (correct.length > words[i].length &&
                    correct.slice(0, words[i].length) == words[i] &&
                    i == words.length - 1) continue;
                if (correct.length < words[i].length &&
                    words[i].slice(0, correct.length) == correct &&
                    i == words.length - 1) continue;
                if (i == words.length - 1 && words[i].length <= 10)  // long enough to correct the last word
                    continue
                correctBack[correct] = words[i];
                words[i] = correct;
            }
        }
        return [words.join(" "), correctBack];
    }
    loadRecords(req) {
        var content = req.response.split("\n");
        for (var i=0; i < content.length; i++) {
            var words = content[i].split("\t");
            var wrong = words[0];
            var right = words[1];
            this.spellCorrectionDict[wrong] = right;
        }
    }
}

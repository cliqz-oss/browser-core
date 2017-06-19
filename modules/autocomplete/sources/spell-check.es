import autocomplete from "autocomplete/autocomplete";
import { utils } from "core/cliqz";
import { isFirefox } from "core/platform";

export default class SpellCheck {
    constructor() {
      this.active = false;
      this.spellCorrectionDict = {};
      this.resetState();
      if (isFirefox && utils.getPref("backend_country", "") == "de") {
          utils.log('Initializing', 'SpellChecker');
          utils.loadResource('chrome://cliqz/content/spell_check.list', this.loadRecords.bind(this));
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
        this.active = true;
    }
    getCurrentMessage(urlbarVal){
      if(this.active && // loading is done
         this.state.on &&
         !this.state.override &&
         !this.state.userConfirmed &&
         utils.getPref('spellCorrMessage', true))
      {
        var terms = urlbarVal.split(" ");
        var messages = [];
        var termsObj = {};
        for(var i = 0; i < terms.length; i++) {
          termsObj = {
            correct: terms[i]
          };
          messages.push(termsObj);
          if(this.state.correctBack[terms[i]]) {
            messages[i].correctBack = this.state.correctBack[terms[i]];
          } else {
            messages[i].correctBack = "";
          }
        }
        //cache searchTerms to check against when user keeps spellcorrect
        this.state.searchTerms = messages;

        return messages;
      }
    }
    revert(urlbarVal){
      for (var c in this.state.correctBack) {
          urlbarVal = urlbarVal.replace(c, this.state.correctBack[c]);
      }
      this.state.override = true;
      return urlbarVal;
    }
    keep(){
      for (var i = 0; i < this.state.searchTerms.length; i++) {
          //delete terms that were found in correctBack dictionary. User accepted our correction:-)
          for (var c in this.state.correctBack) {
              if (this.state.correctBack[c] === this.state.searchTerms[i].correctBack) {
                  delete this.state.correctBack[c];
              }
          }
      }

      this.state.userConfirmed = true;
    }
}

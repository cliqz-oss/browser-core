{{!
    EZ calling this template:
        1. Time: time Berlin
        2. Calculator: 1+2
        3. Unit Converter: 10m to cm
}}
{{#if data.extra.is_calculus}}
    <div class='cqz-result-h3
                ez-calculator
                ez-type-{{ data.extra.ez_type }}'
         {{#if data.extra.support_copy_ans}}
             cliqz-action='copy-calc-answer'
         {{/if}}
      >
    {{#with data.extra}}
        <div class="cqz-result-holder">
           {{! RESULT }}
           <div class="answer">
               {{# if (logic ez_type '===' 'time') }}
                    <div class="cqz-analog-clock prototype" data-time="{{answer}}">
                        <div class="clock side-image" >
                            <div class="notch prototype">
                                <div></div>
                            </div>
                            <div class="hand-hour"></div>
                            <div class="hand-minute"></div>
                            <div class="hand-second"></div>
                        </div>
                        <div class="title"></div>
                        <div class="subtitle"></div>
                    </div>
                {{/if}}

               {{prefix_answer}} <span id='calc-answer'>{{answer}}</span>
           </div>
           <div class="expression">
               {{expression}}

               {{! Copy Message }}
               {{#if support_copy_ans}}
                   <span class="message" id="calc-copy-msg">{{local 'Click anywhere to copy'}}</span>
                   <span class="message" id="calc-copied-msg" style="display: none">{{local 'Copied'}}</span>
                {{else}}
                   <span class="message" id="calc-copy-msg"> {{line3}}</span>
                {{/if}}
           </div>
        </div>
    {{/with}}
    {{> logo}}
    </div>
{{else}}
    <div class='cqz-result-h3 ez-calculator'>
    {{#with data.extra}}
        <div>
           <div class="answer">{{prefix_answer}} {{answer}}</div>
           <div class="expression">{{expression}}</div>
        </div>
    {{/with}}
    {{> logo}}
    </div>
{{/if}}

<!-- calculator.tpl -->

{{#if urlDetails.friendly_url}}
    {{#with logo}}
    	<div class="card__logo {{#if backgroundImage}}bg{{/if}}" data-style="{{#if backgroundImage}}background-image:{{backgroundImage}};{{#if backgroundColor}} background-color:#{{backgroundColor}};{{/if}}{{else}}{{ style }};{{/if}}">{{ text }}</div>
     {{/with}}

    <div class="card__meta">
        <div>{{urlDetails.friendly_url}}</div>
    </div>
{{/if}}

<section class="primary">

    <h1 class="card__title">
       {{timeOrCalculator data.ez_type}} {{data.location}}
    </h1>

    <div class="card__description">
        {{#if data.is_calculus}}
            <div class='cqz-result-h3 ez-calculator' cliqz-action='copy-calc-answer'>
            {{#with data}}
                <div class="main">
                   <div class="main__headline">{{prefix_answer}} <span id='calc-answer'>{{answer}}</span></div>
                   <div class="expression "> {{expression}}</div>
                   {{#if support_copy_ans}}
                       <div class="message" id="calc-copy-msg">{{local 'mobile_calc_copy_ans'}}</div>
                       <div class="message" id="calc-copied-msg" style="display: none">{{local 'Copied'}}</div>
                   {{/if}}
                </div>
            {{/with}}
            </div>
        {{else}}
            <div class='cqz-result-h3 ez-calculator'>
            {{#with data}}
                <div>
                   <div class="answer">{{prefix_answer}} {{answer}}</div>
                   <div class="expression">{{expression}}</div>
                </div>
            {{/with}}
            </div>
        {{/if}} 
    </div>
</section>

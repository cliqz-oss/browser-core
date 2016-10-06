{{#with data}}
<div id='bottom_btn_region'>
    <div class="bottom-btns-container">
        {{#each deepResults}}
            {{partial type}}
        {{/each}}
    </div>
</div>
{{/with}}

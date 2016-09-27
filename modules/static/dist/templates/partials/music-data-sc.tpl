{{#with data}}
<div id='music_btn_region'>
    <div class="music-btns-container">
        {{#each deepResults}}
            {{partial type}}
        {{/each}}
    </div>
</div>
{{/with}}

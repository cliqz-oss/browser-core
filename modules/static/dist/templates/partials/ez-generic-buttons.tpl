<div class='cqz-ez-btns'>
    <div class="cqz-ez-btns-holder" hide-check="">
        {{#each data.btns}}
            <span class="cqz-ez-btn {{ ../logo.buttonsClass }}"
                    url="{{ url }}"
                    extra="{{../data.btnExtra}}-{{@index }}"
                    arrow="false"
                    arrow-if-visible='true'
            >
                {{#if title_key}}
                    {{ local title_key }}
                {{else}}
                    {{ title }}
                {{/if}}
            </span>
        {{/each}}
    </div>
</div>

<div class='cqz-ez-btns'>
{{#each data.btns}}
    <div
      class="cqz-ez-btn {{ ../logo.buttonsClass }}"
      url="{{ url }}"
      extra="{{../data.btnExtra}}-{{@index }}" arrow="false" arrow-if-visible='true'>
      {{#if title_key}}
        {{ emphasis (local title_key) ../../text 2 true}}
      {{else}}
        {{ emphasis title ../../text 2 true}}
      {{/if}}
    </div>
{{/each}}
</div>

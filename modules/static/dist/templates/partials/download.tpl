<span class="cqz-ez-btn-label">{{local "download"}}</span>
{{#each links}}
    <span class="cqz-ez-btn {{ logo.buttonsClass }}"
            url="{{ url }}"
            arrow="false"
            arrow-if-visible='true'
    >
      {{ extra.domain }}

    </span>
{{/each}}
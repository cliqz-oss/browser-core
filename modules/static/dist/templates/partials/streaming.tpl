<span class="cqz-ez-btn-label">{{local "streaming"}}</span>
{{#each links}}
    {{#if image}}
        <img class="cqz-ez-btn"
                url="{{ url }}"
                arrow="false"
                arrow-if-visible='true'
                src="{{ image }}"
                alt="{{ extra.domain }}"
                onerror="this.style.display='none';"
        />
    {{else}}
        <span class="cqz-ez-btn {{ logo.buttonsClass }}"
                url="{{ url }}"
                arrow="false"
                arrow-if-visible='true'
        >
          {{ extra.domain }}

        </span>
    {{/if}}
{{/each}}

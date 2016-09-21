<div class="bottom-btns-wrapper">
    <span class="bottom-label">{{local "download"}}</span>
    <ul class="bottom-btns">
    {{#each links}}
        <li class="bottom-btn"
                url="{{ url }}"
                extra="{{ extra.domain }}" arrow="false" arrow-if-visible="true"
        >
            {{#if image}}
                <img class="bottom-btn-img" src="{{ image }}" alt="{{ extra.domain }}" onerror="this.style.display='none';"/>
            {{else}}
                <span class="bottom-btn-text" style="background-color: {{ generate_background_color url }}">{{ extra.domain }}</span>
            {{/if}}
        </li>
    {{/each}}
    </ul>
</div>

<div class="music-btns-wrapper">
    <span class="music-label">{{local 'streaming'}}</span>
    <ul class="music-btns">
    {{#each links}}
        <li class="music-btn"
                url="{{ url }}"
                extra="{{ extra.domain }}" arrow="false" arrow-if-visible="true"
        >
            {{#if image}}
                <img class="music-btn-img" src="{{ image }}" alt="{{ extra.domain }}" onerror="this.style.display='none';"/>
            {{else}}
                <span class="music-btn-text" style="background-color: {{ generate_background_color url }}">{{ extra.domain }}</span>
            {{/if}}
        </li>
    {{/each}}
    </ul>
</div>

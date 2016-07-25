<div class="music-btns-wrapper">
    <span class="music-label">{{local 'lyrics'}}</span>
    <ul class="music-btns">
    {{#each links}}
        <li class="music-btn"
                url="{{ url }}"
                extra="{{ extra.domain }}" arrow="false" arrow-if-visible="true"
        >
            <span class="music-btn-text" style="background-color: {{ generate_background_color url }}">{{ extra.domain }}</span>
        </li>
    {{/each}}
    </ul>
</div>

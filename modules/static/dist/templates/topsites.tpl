<div class='cqz-result-box'>
    <div class='cqz-result-h2 cqz-result-padding cqz-noresult-box cqz-topsites'>
        {{#with data}}
            <div class="cqz-ez-title custom-after cqz-ez-generic-title" extra="title">
                {{ title }}
            </div>
            <div class="ez-no-result">
                <ul class="cqz-suggestion-list">
                    {{#each urls}}
                        <li class="cqz-item"
                            show-status="true"
                            url="{{url}}"
                        >
                            <div class="cliqz-brand-logo transition"
                                 style="{{style}}"
                                 extra="{{extra}}"
                                 show-status="true"
                                 url="{{url}}"
                                 title="{{url}}"
                            >
                                {{ text }}
                            </div>
                            <span class="item-name">{{name}}</span>
                        </li>
                    {{/each}}
                </ul>
                <p>
                    <img class="cliqz-logo" src="{{cliqz_logo}}" url="https://cliqz.com" />
                </p>
            </div>
        {{/with}}
    </div>
</div>
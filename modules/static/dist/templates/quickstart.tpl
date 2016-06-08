{{#with data}}
<div class="cqz-result-h1 ez-quickstart nopadding">
    <div class="h1">{{header}}</div>

    <div class="logos">
        {{#each pages}}
            <div class="cliqz-brand-logo transition"
                  style="{{logo.style}}"
                  engine="{{name}}"
                  engineCode="{{code}}"
                  cliqz-action="alternative-search-engine"></div>
        {{/each}}
    </div>

    <div class="message">{{message}}</div>

    <img class="cliqz-logo" src="{{cliqz_logo}}" url="https://cliqz.com" />
</div>
{{/with}}
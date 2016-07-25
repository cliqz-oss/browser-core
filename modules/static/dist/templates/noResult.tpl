{{#with data}}
<div class="cqz-result-h1 ez-no-result nopadding">
    <div class="h1">{{text_line1}}</div>
    <div class="h2">{{text_line2}}</div>

    <div class="logos" id="EZ-noResult-logos" >
        {{#each search_engines}}
            <div class="cliqz-brand-logo transition"
                  style="{{style}}"
                  title = "{{local 'searchUsing'}} {{name}}"
                  engine="{{name}}"
                  engineCode="{{code}}"
                  cliqz-action="alternative-search-engine">{{ text }}</div>
        {{/each}}
    </div>
    <div class="cliqz-logo" url="https://cliqz.com"></div>
</div>
{{/with}}

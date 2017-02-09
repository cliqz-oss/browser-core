{{#with logo}}
    <div extra="logo"
         class='cliqz-brand-logo cqz-result-logo-simple cqz-vert-center transition'
        {{#if add_logo_url}}
            url="{{logo_url}}"
        {{/if}}
        style="{{ style }};left:{{math ../data.resultXPosition '+' 7}}px;"
        dont-remove="true"
    >
        {{ text }}
    </div>
{{/with}}

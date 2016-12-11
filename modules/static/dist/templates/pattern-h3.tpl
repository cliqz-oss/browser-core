<!-- pattern-h3 -->
<div class='cqz-result-h3 cqz-result-padding cqz-result-pattern cqz-3-history-results'>
      <div class='cliqz-pattern'>
        {{#each data.urls}}
        <div class='cliqz-pattern-element overflow'
             url='{{href}}' shortUrl='{{link}}'
             domain='{{domain}}'
             extra='{{extra}}'
             arrow='false'
             local-source="{{style}}"
             kind='{{ kind_printer kind }}'>
            <div class='cliqz-pattern-element-title'>{{ emphasis title ../text 2 true }}</div>
            <div class='cliqz-pattern-element-link'>{{ emphasis link ../text 2 true }}</div>

            {{#with logo}}
                <div
                    newtab='true'
                    class='cliqz-brand-logo
                           cliqz-history-logo
                           transition'
                    {{#if add_logo_url}}
                        url="{{logo_url}}"
                    {{/if}}
                    style="{{ style }};"
                >
                    {{ text }}
                </div>
            {{/with}}
        </div>
        {{/each}}
    </div>

</div>
<!-- end pattern-h3 -->

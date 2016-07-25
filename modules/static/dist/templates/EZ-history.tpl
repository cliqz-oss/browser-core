<!-- EZ-history.tpl -->
{{#with data}}
	<div class='cliqz-history-results cqz-3-history-results'>
        {{#each urls}}
            <div class='cliqz-pattern-element overflow'
                 style='padding-left: 0px;'
                 url='{{href}}' shortUrl='{{link}}'
                 extra='{{extra}}'
                 domain='{{domain}}'
                 arrow='false'
                 kind='{{ kind_printer kind }}'>
                <div class='cliqz-pattern-element-title'>{{ emphasis title ../../text 2 true }}</div>
                <div class='cliqz-pattern-element-link'>{{ emphasis link ../../text 2 true }}</div>
            </div>
        {{/each}}
    </div>
{{/with}}
<!-- end EZ-history.tpl -->
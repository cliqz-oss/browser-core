<!-- pattern-h2 -->
<div class='cqz-result-h2 cqz-result-padding cqz-result-pattern'
     local-source='{{ data.localSource }}'>
    <div class='cqz-ez-title cliqz-pattern-title-h2 overflow'
         arrow='false'
         url='{{data.url}}'
         dont-remove='true'>
        {{ emphasis data.title text 2 true }}
    </div>
    <div class='cqz-result-url cliqz-pattern-url-h2 overflow
                    {{#if urlDetails.ssl }}
                         cqz-result-url-ssl
                    {{/if}}
        ' extra="url"
        dont-remove='true'>
        {{ emphasis urlDetails.friendly_url text 2 true }}
    </div>

    <div class="cqz-ez-generic">
        <div class="cqz-history cqz-vertical-title-holder" style="margin-top: 0;">
            <span class="cqz-vertical-title">{{local 'history'}}</span>
            <ul class="cqz-history-list cqz-list-restricted">
                {{#each data.urls }}
                    <li class="cqz-ellipsis"
                        url="{{href}}"
                        shortUrl="{{link}}"
                        extra="{{extra}}"
                        domain="{{domain}}"
                        arrow="false"
                        local-source="{{style}}"
                        useParentOffset="true">
                        <span class='cqz-history-item-title'>{{ emphasis title ../../text 2 true }}</span>
                        <span class='cqz-history-item-link'>{{ emphasis link ../../text 2 true }}</span>
                    </li>
                {{/each}}
            </ul>
        </div>
    </div>
    {{>logo}}
</div>
<!-- end pattern-h2 -->

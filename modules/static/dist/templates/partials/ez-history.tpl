<div class="cqz-history cqz-vertical-title-holder">
    <span class="cqz-vertical-title">{{local 'history'}}</span>
    <ul class="cqz-history-list">
        {{#each data.urls }}
            <li class="cqz-ellipsis"
                 url="{{href}}"
                 shortUrl="{{link}}"
                 extra="{{extra}}"
                 domain="{{domain}}"
                 arrow="false"
                 useParentOffset="true">
                <span class='cqz-history-item-title'>{{ emphasis title ../../text 2 true }}</span>
                <span class='cqz-history-item-link'>{{ emphasis link ../../text 2 true }}</span>
            </li>
        {{/each}}
    </ul>
</div>

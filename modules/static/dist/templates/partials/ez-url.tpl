
<div class="clearfix cqz-ez-subtitle cqz-ellipsis {{#if urlDetails.ssl }}cqz-result-url-ssl{{/if}}" extra="url">
    {{# if data.hasAd }}
        {{ urlDetails.domain }}
    {{ else }}
        {{ emphasis urlDetails.friendly_url text 2 true }}
    {{/if}}
</div>

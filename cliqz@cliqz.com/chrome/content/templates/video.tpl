<div class='cqz-result-h3'>
    {{#if debug}}
        <span class='cqz-result-debug'>{{ debug }}</span>
    {{/if}}
    {{#if image.src}}
        <div class="cqz-image" style="background-image: url({{ image.src }});">
            {{#if image.text }}<p class='cqz-video-arrow'>{{ image.text }}</p>{{/if}}
        </div>
    {{/if}}
    <div class='cqz-result-center'>
      <div class='cqz-result-title overflow' extra="title"><a href="{{url}}" extra="title">{{ emphasis title text 2 true }}</a></div>
        <div class='cqz-result-url overflow
                    {{#if urlDetails.ssl }}
                         cqz-result-url-ssl
                    {{/if}}
        ' extra="url">
            {{ emphasis urlDetails.friendly_url text 2 true }}{{ emphasis urlDetails.extra text 2 true }}
        </div>
        <div class='cqz-result-desc overflow' extra="des-nview">{{ views_helper data.richData.views }}</div>
    </div>
    {{> logo}}
</div>

<div class='cqz-result-h3'>
    {{#if image.src}}
        <div class="cqz-video-image">
            <div class="cqz-img-holder" style="background-image: url({{ image.src }});">
                {{#if image.text }}<span class='cqz-video-duration'>{{ image.text }}</span>{{/if}}
            </div>
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

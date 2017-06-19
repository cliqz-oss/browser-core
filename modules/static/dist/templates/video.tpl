<div class='cqz-result-h3'>
    {{#if data.extra.image.src}}
        <div class="cqz-video-image">
            <div class="cqz-img-holder" style="background-image: url({{ data.extra.image.src }});">
                {{#if data.extra.rich_data.duration }}<span class='cqz-video-duration'>{{ sec_to_duration data.extra.rich_data.duration }}</span>{{/if}}
            </div>
        </div>
    {{/if}}
    <div class='cqz-result-center'>
      <div class='cqz-result-title overflow' extra="title"><a href="{{url}}" extra="title">{{ emphasis title text 2 true }}</a></div>
        {{> 'partials/ez-url' }}
        <div class='cqz-result-desc overflow' extra="des-nview">{{ views_helper data.extra.rich_data.views }}</div>
    </div>
    {{> logo}}
</div>

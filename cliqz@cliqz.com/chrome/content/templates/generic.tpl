<div class='cqz-result-h3'>
    <div class='cqz-result-center'>
      <div class='cqz-result-title overflow' arrow-override=''><a extra="title" href="{{url}}">{{ emphasis title text 2 true }}</a></div>
      <div class='cqz-result-url overflow
                {{#if urlDetails.ssl }}
                     cqz-result-url-ssl
                {{/if}}' extra="url">
        {{ emphasis urlDetails.friendly_url text 2 true }}
      </div>
      <div class='cqz-result-desc overflow'>
            <span extra="des">{{ emphasis data.description text 2 true }}</span>
      </div>
    </div>
    {{> logo}}
</div>
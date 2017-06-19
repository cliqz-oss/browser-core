<div class='cqz-result-h3'>
    {{#if data.extra.image.src}}
        <div class="cqz-image cqz-image-news cqz-image-round " style="background-image: url({{ data.extra.image.src }});"></div>
    {{/if}}
    <div class='cqz-result-center'>
      <div class='cqz-result-title overflow' arrow-override=''><a extra="title" href="{{url}}">{{ emphasis title text 2 true }}</a></div>
        {{> 'partials/ez-url' }}
        <div class='cqz-result-desc overflow'>
        	{{#if data.extra.rich_data.discovery_timestamp}}
        	    <span style="color: #d7011d; padding-right:5px; " extra="des-timestamp">{{ agoline data.extra.rich_data.discovery_timestamp }}</span>
            {{/if}}
            <span extra="des">{{ emphasis data.description text 2 true }}</span>
        </div>
    </div>
    {{> logo}}
</div>

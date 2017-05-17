<!-- hq.tpl -->
<div class='{{wikiEZ_height this}}'>
    {{#each data.deepResults}}
      {{#if (logic type '===' 'images')}}
        <!--don't change to padding-bottom: images jump to 2nd line when overflow-->
        {{#if (logic links.length '>' 0)}}
          <div class='cqz-celeb-images' style="margin-bottom: 18px">
            {{#each links}}
              {{#if (limit @index 5)}}
                <img src='{{image}}' url='{{url}}' class='cqz-celeb-image' onerror="this.style.display='none';"/>
              {{/if}}
            {{/each}}
          </div>
        {{/if}}
      {{/if}}
    {{/each}}

    <div class='cqz-result-center' style="{{#if (logic (wikiEZ_height this) 'is' 'cqz-result-h2') }}margin-top: -5px{{/if}}">
      <div extra="title" class='cqz-result-title overflow'
        arrow="false" arrow-override=''
        ><a href="{{url}}" extra="title">{{ emphasis title text 2 true }}</a></div>
      <div class='cqz-result-url overflow
                  {{#if urlDetails.ssl }}
                       cqz-result-url-ssl
                  {{/if}}
      ' extra="url">
          {{ emphasis urlDetails.friendly_url text 2 true }}
      </div>
      <div class='cqz-result-desc overflow' style="height: 20px;">
        <span extra="des">{{ emphasis data.description text 2 true }}</span>
      </div>
      {{#if (logic (wikiEZ_height this) '!=' 'cqz-result-h3') }}
        {{#each data.deepResults}}
          {{#if (logic type '===' 'simple_links')}}
            <div class="cqz-one-line" style="white-space: normal; height: 18px; margin-top: 5px;">
              {{#each links}}
                <span url='{{url}}' show-status='true'
                 extra='sources{{ @index }}'
                 class='cqz-link'>
                  {{title}}
                </span>
              {{/each}}
            </div>
          {{/if}}
        {{/each}}

      {{/if}}
  </div>
  {{> logo}}
</div>

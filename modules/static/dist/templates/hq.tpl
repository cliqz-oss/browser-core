<div class='{{wikiEZ_height data.richData}}'>
    {{#if data.richData.images.length}}
        <!--don't change to padding-bottom: images jump to 2nd line when overflow-->
        <div class='cqz-celeb-images' style="margin-bottom: 18px">
          {{#if data.richData.map}}
            <div url="{{data.richData.map.search_url}}" style="float:left" >
                <img src="{{data.richData.map.url}}" alt="{{data.richData.map.alt_text}}" class='cqz-celeb-image'/>
            </div>
          {{/if}}

          {{#each data.richData.images}}
            {{#if (limit @index 5)}}
            <img src='{{this}}' class='cqz-celeb-image' onerror="this.style.display='none';"/>
            {{/if}}
          {{/each}}
        </div>
    {{/if}}

    <div class='cqz-result-center' style="{{#if (logic (wikiEZ_height data.richData) 'is' 'cqz-result-h2') }}margin-top: -5px{{/if}}">

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
        {{#if (logic (wikiEZ_height data.richData) '!=' 'cqz-result-h3') }}
          {{#if (links_or_sources data.richData) }}
              <div class="cqz-one-line" style="white-space: normal; height: 18px; margin-top: 5px;">
              {{#each (links_or_sources data.richData)}}
                  <span url='{{url}}' show-status='true'
                       extra='sources{{ @index }}'
                       class='cqz-link'>
                      {{title}}
                  </span>
              {{/each}}
              </div>
          {{/if}}
        {{/if}}
    </div>
    {{> logo}}
</div>

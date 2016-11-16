<div class="cqz-result-h1 ez-news cqz-result-padding">
  <div class="cqz-ez-title" selectable='' extra="title"><a href="{{url}}" extra="title">{{ emphasis data.name text 2 true }}</a></div>
  <span class="cqz-ez-subtitle"  extra="url">
    {{ emphasis urlDetails.friendly_url text 2 true }}
  </span>
  <div class="entity-stories latest">
    {{#each data.deepResults}}
      {{#if (logic type '===' 'news')}}
        {{#each links}}
          <div class="entity-story"
               url="{{ url }}"
               extra="entry-{{ @index }}"
               arrow="false">
            <div class="entity-story-image">
              <span class="cqz-img-holder" style="background-image: url({{ extra.thumbnail }})"></span>
            </div>
            <div class="entity-story-description">
              <div class="entity-story-title"><a href="{{url}}">{{ title }}</a></div>
              <div class="entity-story-comment">
                <span style="color: #d7011d; padding-right:5px; " extra="des-timestamp">
                  {{ agoline extra.creation_timestamp }}
                </span>
                {{#if (logic extra.tweet_count '>' 1) }}
                  <span class="cqz-twitter-count">
                    {{ extra.tweet_count }}
                  </span>
                {{/if}}
              </div>
            </div>
          </div>
        {{/each}}
      {{/if}}
    {{/each}}
  </div>

  {{>partials/ez-generic-buttons}}
  {{>logo}}

</div>

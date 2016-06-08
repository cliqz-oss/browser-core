<div class="cqz-result-h1 ez-news cqz-result-padding">
  <div class="cqz-ez-title" selectable='' extra="title"><a href="{{url}}" extra="title">{{ emphasis data.name text 2 true }}</a></div>
  <span class="cqz-ez-subtitle"  extra="url">
    {{ emphasis urlDetails.friendly_url text 2 true }}
  </span>
  <div class="entity-stories latest">
    {{#each data.news}}
      <div class="entity-story"
           url="{{ url }}"
           extra="entry-{{ @index }}"
           arrow="false">
        <div class="entity-story-image">
          <span class="cqz-img-holder" style="background-image: url({{ thumbnail }})"></span>
        </div>
        <div class="entity-story-description">
          <div class="entity-story-title"><a href="{{url}}">{{ title }}</a></div>
          <div class="entity-story-comment">
            {{ time }}
              {{#if (logic tweet_count '>' 1) }}
                <span class="cqz-twitter-count">
                  {{ tweet_count }}
                </span>
            {{/if}}
          </div>
        </div>
      </div>
    {{/each}}
  </div>

  {{>partials/ez-generic-buttons}}
  {{>logo}}

</div>

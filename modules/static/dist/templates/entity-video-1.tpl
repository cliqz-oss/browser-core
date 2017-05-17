<div class="cqz-result-h1 cqz-result-padding ez-video">
  {{#with data}}
    <div class="cqz-ez-title" extra="title"><a href="{{url}}" extra="title">{{title}}{{#if extra.name_cat }} - {{ local extra.name_cat }} {{/if}}</a></div>
    <span class="cqz-ez-subtitle"  extra="url">
      {{ emphasis urlDetails.friendly_url text 2 true }}
    </span>
    <div class="entity-stories">
      {{#each deepResults}}
        {{#if (logic type '===' 'videos')}}
          {{#each links}}
            <div class="entity-story"
                 url="{{ url }}"
                 extra="entry-{{ @index }}"
                 arrow="false">
              <div class="entity-story-image">
                  <span class="cqz-img-holder" style="background-image: url({{ extra.thumbnail }})"></span>
                 {{#if (sec_to_duration extra.duration)}}
                     <span class="cqz-video-duration"> {{ sec_to_duration extra.duration}}</span>
                 {{/if}}
              </div>
              <div class="entity-story-description" >
                <div class="entity-story-title"><a href="{{url}}">{{ title }}</a></div>
                <div class="entity-story-comment">{{ views_helper extra.views}}</div>
              </div>
            </div>
          {{/each}}
        {{/if}}
      {{/each}}
    </div>
  {{/with}}
  {{>partials/ez-generic-buttons}}
  {{>logo}}

</div>

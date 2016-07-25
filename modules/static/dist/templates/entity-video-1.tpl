<div class="cqz-result-h1 cqz-result-padding ez-video">
  <div class="cqz-ez-title" extra="title"><a href="{{url}}" extra="title">{{data.name}}{{#if data.name_cat }} - {{ local data.name_cat }} {{/if}}</a></div>
  <span class="cqz-ez-subtitle"  extra="url">
    {{ emphasis urlDetails.friendly_url text 2 true }}
  </span>
  <div class="entity-stories">
    {{#each data.items}}
      <div class="entity-story"
           url="{{ link }}"
           extra="entry-{{ @index }}"
           arrow="false">
        <div class="entity-story-image">
            <span class="cqz-img-holder" style="background-image: url({{ thumbnail }})"></span>
           {{#if (sec_to_duration duration)}}
               <span class="cqz-video-duration"> {{ sec_to_duration duration}}</span>
           {{/if}}
        </div>
        <div class="entity-story-description" >
          <div class="entity-story-title"><a href="{{link}}">{{ title }}</a></div>
          <div class="entity-story-comment">{{ views_helper views}}</div>
        </div>
      </div>
    {{/each}}
  </div>
  {{>partials/ez-generic-buttons}}
  {{>logo}}

</div>

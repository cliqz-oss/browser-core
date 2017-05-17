{{!-- maxNumberOfSlots is set for every result in UI.handleResults --}}
{{#if (logic maxNumberOfSlots '===' 3)}}
  <div class="cqz-result-h1 cqz-rd cqz-result-padding">
    {{#with data}}
      <div class="cqz-rd-body">
          <div class="cqz-result-title overflow" arrow-override=''><a extra="title" href="{{../url}}">{{extra.rich_data.name}}</a></div>
          <div class="cqz-result-url overflow" extra="url">{{../urlDetails.friendly_url}}</div>

          <div class="cqz-rd-h2-snippet">
              {{#if extra.rich_data.image}}
              <div class="cqz-rd-img_div cqz-image-round">
                 <img src="{{extra.rich_data.image}}" class="cqz-rd-next" onerror="this.style.display='none';"/>
              </div>
              {{/if}}

              {{>pcgame_movie_side_snippet}}
          </div>
      </div>
    {{/with}}
    {{>partials/ez-generic-buttons}}
    {{> logo}}
  </div>
{{else}}
  {{>rd-h3-w-rating}}
{{/if}}

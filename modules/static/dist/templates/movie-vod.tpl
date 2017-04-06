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
              {{#if deepResults}}
              <div class="cqz-ez-btns layout_foot_node">
                {{#each deepResults}}
                  {{# if (logic type '===' 'buttons')}}
                    {{#each links}}
                      <span
                          class="cqz-ez-btn {{ ../../../logo.buttonsClass }} movie_info_btn"
                          url="{{ url }}"
                          extra="{{title}}" arrow="false" arrow-if-visible='true'
                      >
                        {{local title}}
                      </span>
                    {{/each}}
                  {{else if (logic type '===' 'streaming')}}
                    <span class="stream_txt">{{local "Stream_now"}}:</span>
                    <ul class="stream_btns">
                        {{#each links}}
                            <li class="stream_btn_container"
                                url="{{url}}"
                                extra="{{extra.source}}" arrow="false" arrow-if-visible="true"
                                >
                                <img src="{{image}}" class="stream_btn_img" onerror="this.style.display='none';"/>
                            </li>
                        {{/each}}
                    </ul>
                  {{/if}}
                {{/each}}
              </div>
              {{/if}}

              {{>pcgame_movie_side_snippet}}
          </div>
      </div>
    {{/with}}
    {{#unless deepResults}}
        {{>partials/ez-generic-buttons}}
    {{/unless}}
    {{> logo}}
  </div>
{{else}}
  {{>rd-h3-w-rating}}
{{/if}}

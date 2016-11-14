<div class="cqz-result-h1 cqz-rd cqz-vod cqz-result-padding">
    {{#log this}}{{/log}}
    {{#with data}}
        <div class="cqz-rd-body {{#if i}}layout_no_foot_node{{/if}}" >
            <div class="cqz-result-title overflow" arrow-override=''><a extra="title" href="{{../url}}">{{extra.n}}</a>
            </div>
            <div class="cqz-result-url overflow" extra="url">{{../urlDetails.friendly_url}}</div>

            <div class="cqz-rd-h2-snippet">
                {{#if extra.i}}
                    <div class="cqz-rd-img_div cqz-image-round">
                        <img src="{{extra.i}}" class="cqz-rd-img" onerror="this.style.display='none';"/>
                    </div>
                {{/if}}

                <div>
                    <div class="rd_info_block">
                        {{#if (logic extra.directors '&&' extra.directors.t)}}
                            <div class="cqz-rd-info">{{local extra.directors.t}}:
                                {{#each extra.directors.i}}
                                    <a href="{{u}}" class="cqz-rd-link" extra="director">{{n}} </a>
                                {{/each}}
                            </div>
                        {{/if}}

                        {{#if (is_not_dummy extra.l)}}
                            <div class="cqz-rd-info-2">{{local 'Movie_Length' extra.l}}</div>
                        {{/if}}

                        {{#if extra.r}}
                            <img src="{{extra.r.img}}" class="cqz-rd-rateimg" onerror="this.style.display='none';"/>

                            <div class="cqz-rd-rate">
                                {{localizeNumbers extra.r.val}}/{{extra.r.scale}}
                                {{#if extra.r.nVote}} {{local 'from_lcase'}} {{localizeNumbers extra.r.nVote}} {{local 'Votes'}}{{/if}}
                            </div>
                        {{/if}}

                        <div class="cqz-multy-lines-ellipses">
                            <p>{{description}}</p>
                        </div>
                    </div>
                    {{#if extra.i}}
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
                                        url="{{u}}"
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
                </div>
            </div>
        </div>
        {{#unless extra.i}}
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
                        <li>
                          <span class="stream_btn_container"
                            url="{{u}}"
                            extra="{{extra.source}}" arrow="false" arrow-if-visible="true"
                            ><img src="{{image}}" class="stream_btn_img" onerror="this.style.display='none';"/></span>
                        </li>
                    {{/each}}
                </ul>
              {{/if}}
            {{/each}}
          </div>
        {{/unless}}
      {{/with}}
    {{> logo}}
</div>

<div class="cqz-result-h1 cqz-rd cqz-vod cqz-result-padding">
    {{#with data}}
        <div class="cqz-rd-body {{#if i}}layout_no_foot_node{{/if}}" >
            <div class="cqz-result-title overflow" arrow-override=''><a extra="title" href="{{../url}}">{{n}}</a>
            </div>
            <div class="cqz-result-url overflow" extra="url">{{../urlDetails.friendly_url}}</div>

            <div class="cqz-rd-h2-snippet">
                {{#if i}}
                    <div class="cqz-rd-img_div cqz-image-round">
                        <img src="{{i}}" class="cqz-rd-img" onerror="this.style.display='none';"/>
                        {{#if categories}}
                            <div class="cqz-ez-btns">
                                <span
                                    class="cqz-ez-btn {{ ../../../logo.buttonsClass }} movie_info_btn"
                                    url="{{ categories.0.url }}"
                                    extra="{{categories.0.title_key}}" arrow="false" arrow-if-visible='true'
                                >
                                  {{local categories.0.title_key}}
                                </span>
                            </div>
                        {{/if}}
                    </div>
                {{/if}}

                <div>
                    <div class="rd_info_block">
                        {{#if (logic directors '&&' directors.t)}}
                            <div class="cqz-rd-info">{{local directors.t}}:
                                {{#each directors.i}}
                                    <a href="{{u}}" class="cqz-rd-link" extra="director">{{n}} </a>
                                {{/each}}
                            </div>
                        {{/if}}

                        {{#if (is_not_dummy l)}}
                            <div class="cqz-rd-info-2">{{local 'Movie_Length' l}}</div>
                        {{/if}}

                        {{#if r}}
                            <img src="{{r.img}}" class="cqz-rd-rateimg" onerror="this.style.display='none';"/>

                            <div class="cqz-rd-rate">
                                {{localizeNumbers r.val}}/{{r.scale}}
                                {{#if r.nVote}} {{local 'from_lcase'}} {{localizeNumbers r.nVote}} {{local 'Votes'}}{{/if}}
                            </div>
                        {{/if}}

                        <div class="cqz-multy-lines-ellipses">
                            <p>{{des}}</p>
                        </div>
                    </div>
                    {{#if i}}
                        <div class="cqz-ez-btns">
                            <span class="stream_txt">{{local "Stream_now"}}:</span>
                            <ul class="stream_btns">
                                {{#each w}}
                                    <li class="stream_btn_container"
                                        url="{{u}}"
                                        extra="{{source}}" arrow="false" arrow-if-visible="true"
                                        >
                                        <img src="{{logo}}" class="stream_btn_img" onerror="this.style.display='none';"/>
                                    </li>
                                {{/each}}
                            </ul>
                        </div>
                    {{/if}}
                </div>
            </div>
        </div>
        {{#unless i}}
            <div class="cqz-ez-btns layout_foot_node">
                {{#if categories}}
                    <span
                        class="cqz-ez-btn {{ ../../../logo.buttonsClass }} movie_info_btn"
                        url="{{ categories.0.url }}"
                        extra="{{categories.0.title_key}}" arrow="false" arrow-if-visible='true'
                    >
                      {{local categories.0.title_key}}
                    </span>
                {{/if}}
                <span class="stream_txt">{{local "Stream_now"}}:</span>
                <ul class="stream_btns">
                    {{#each w}}
                        <li class="stream_btn_container"
                            url="{{u}}"
                            extra="{{source}}" arrow="false" arrow-if-visible="true"
                            >
                            <img src="{{logo}}" class="stream_btn_img" onerror="this.style.display='none';"/>
                        </li>
                    {{/each}}
                </ul>
            </div>
        {{/unless}}
        {{/with}}
    {{> logo}}
</div>

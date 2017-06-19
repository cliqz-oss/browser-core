{{#with extra.rich_data}}
    {{!--
      {{#if (logic superType '===' 'game')}}
        <div>
            <div class="cqz-rd-info">{{local 'GameCategory'}}: {{game_cat}}</div>
            {{#if rating}}
                <img src="{{rating.img}}" class="cqz-rd-rateimg"
                     onerror="this.style.display='none';"/>

                <div class="cqz-rd-rate">{{localizeNumbers rating.val}}/{{rating.scale}}</div>
            {{/if}}
            <div class="cqz-multy-lines-ellipses">{{des}}</div>
        </div>
    {{/if}}
    {{#if (logic superType '===' 'movie')}}
    --}}
        <div>
            {{#if (logic director '&&' director.title)}}
                <div class="cqz-rd-info">{{local director.title}}: <a href="{{director.info.url}}" class="cqz-rd-link"
                                                                      extra="director">{{director.info.name}}</a></div>
            {{/if}}

            {{#if (is_not_dummy length)}}
                <div class="cqz-rd-info-2">{{local 'Movie_Length' length}}</div>
            {{/if}}

            {{#if rating}}
                <img src="{{rating.img}}" class="cqz-rd-rateimg" onerror="this.style.display='none';"/>
                <div class="cqz-rd-rate">
                    {{localizeNumbers rating.val}}/{{rating.scale}}
                    {{#if rating.nVote}} {{local 'from_lcase'}} {{localizeNumbers rating.nVote}} {{local 'Votes'}}{{/if}}
                </div>
            {{/if}}
            <div class="cqz-multy-lines-ellipses">
                <p>{{des}}</p>
            </div>
        </div>
    {{!--
      <!-- {{/if}} -->
    --}}
{{/with}}

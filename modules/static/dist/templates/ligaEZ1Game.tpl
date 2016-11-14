<div class="cqz-result-h1 ez-liga-genSM">

        <div class="cqz-result-title overflow" extra="title"><a href="{{../url}}">{{data.title}}</a></div>
        <div class="cqz-result-url overflow" extra="url">{{../urlDetails.friendly_url}}</div>
        <div class="cqz-multy-lines-ellipses cqz-line-vis-2">
            <p>{{data.description}}</p>
        </div>
    {{#with data.extra}}
        <div class="ez-liga-genSM-gamestt-holder" url="{{live_url}}" extra="single-game-box">
            <div class="ez-liga-genSM-gamestt rotate90 {{#if score}} ez-liga-genSM-gamestt_live {{/if}}">
                {{#if isLive}}LIVE{{else}}{{#if scored}}{{local 'LAST GAME'}}{{else}}{{local 'NEXT GAME'}}{{/if}}
                {{/if}}
            </div>
            <div class="ez-liga-genSM-game-box {{#if score}} ez-liga-genSM-game-box_live {{/if}}"
                 extra="soccer-live">
                <div class="ez-liga-genSM-1line">{{leagueName}}</div>
                <div class="ez-liga-genSM-1line">{{spielTag}} - {{gameTime}}</div>
                <div class="ez-liga-genSM-1line ez-liga-genSM-Loc">{{location}}</div>

                <div class="ez-liga-oneGameScore">
                    <div class="ez-liga-teamName">{{HOST}}</div>
                    <div class="ez-liga-connector">
                        {{#if isLive}}
                            <div class="ez-liga-score">{{scored}}</div>
                        {{else}}
                            {{#if scored}}
                                <div class="ez-liga-vs">{{scored}}</div>
                            {{else}}
                                <div class="ez-liga-genSM-vs">{{local 'vs'}}</div>
                            {{/if}}
                        {{/if}}
                    </div>
                    <div class="ez-liga-teamName">{{GUESS}}</div>
                </div>
            </div>
        </div>

        <div class="ez-liga-sponsor">{{local 'KickerSponsor'}}</div>

    {{/with}}
    {{#if data.btns}}
        {{>partials/ez-generic-buttons}}
    {{/if}}
    {{>logo}}
</div>

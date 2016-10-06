<!-- liveTicker.tpl -->
{{#with logo}}
    <div extra="logo" class="card__logo {{#if backgroundImage}}bg{{/if}}" data-style="{{#if backgroundImage}}background-image:{{backgroundImage}};{{#if backgroundColor}} background-color:#{{backgroundColor}};{{/if}}{{else}}{{ style }};{{/if}}">
        {{ text }}
    </div>
{{/with}}
    
<section class="primary">
    <h1 extra="title" class="card__title">{{ data.title }}</h1>
    <div extra="url" class="card__meta">
        <div>{{url}}</div>
    </div>
</section>
<section class="secondary">
    <div class="card__description bundesliga">
        {{#each data.matches }}
            <h2>{{ data.spielTag }} {{ this.date }}</h2>
            <table cellspacing="0" cellpadding="0">
                {{#each this.matches }}
                    <tr class="{{ this.class }}" url="{{ this.live_url }}">
                        <td class="cqz-game-time">
                            {{ this.gameTimeHour }}
                        </td>
                        <td>
                            {{ this.GUESS }}
                        </td>
                        <td class="cqz-score">
                            {{ this.scored }}
                        </td>
                        <td class="lastcell">
                            {{ this.HOST }}
                        </td>
                    </tr>
                {{/each}}
            </table>
        {{/each}}
    </div>
</section>

<div class="poweredby" url="http://www.kicker.de/?gomobile=1">
    {{local 'KickerSponsor'}}
</div>
<!-- end liveTicker.tpl -->
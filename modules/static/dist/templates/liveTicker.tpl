<!--<div id="cliqz-results">-->
<div class="{{ data.livetickerSizeClass }} cqz-liveticker cqz-ez-holder cqz-ez-generic">
  <div class="cqz-zone-holder">
    <div class="cqz-ez-title" selectable='' extra="title">
        <a href="{{../url}}" extra="title"> {{ data.title }}  </a>
    </div>
    <div class="cqz-result-url overflow" extra="url">
        {{ emphasis urlDetails.friendly_url text 2 true }}
    </div>

    <div class="cqz-liveticker-table">
      <span class="cqz-vertical-title">{{ data.extra.spielTag }}</span>
      <ul>
        {{#each data.extra.matches }}
          <li>
            <span class="cqz-game-date">{{ this.date }}</span>
            <table>
              {{#each this.matches }}
                <tr class="{{ this.class }}" href="{{ this.live_url }}">
                  <td class="cqz-game-time">
                    <span>{{ this.gameTimeHour }}</span>
                  </td>
                  <td>
                    {{ this.HOST }}
                  </td>
                  <td class="cqz-score">
                    {{ this.scored }}
                  </td>
                  <td>
                    {{ this.GUESS }}
                  </td>
                </tr>
              {{/each}}
            </table>
          </li>
        {{/each}}
      </ul>
    </div>
    <div class="ez-liga-sponsor">{{local 'KickerSponsor'}}</div>
  </div>
  {{>logo}}
</div>

<!--</div>-->

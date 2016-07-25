<div class="cqz-result-h2 cqz-result-padding cqz-ez-aTob" extra="title-0">
    {{#with data}}
    <div class="cqz-ez-title cqz-ez-aTob-title" extra="title">
      <h2 extra="title"><a class="titleLink" href="{{../url}}">{{local 'from'}} {{from_city }} {{local 'to'}} {{ to_city }}</a></h2>
        <span class="subtitle" extra="url">
          {{ emphasis ../urlDetails.friendly_url text 2 true }}
        </span>
    </div>
    <table class="list">
        <tbody>
            <tr>
                <th class="empty"><span></span></th>
                <th class="date">{{local 'today'}}</th>
                <th class="date">{{days.[1]}}</th>
                <th class="itemtype">{{days.[2]}}</th>
            </tr>
            
            {{#each meansOfTrans}}
            <tr>
                <td class="label">
                    <span class="iconContainer">
                       <img class="iconImage {{class}}" src="{{ icon }}" />
                    </span>
                    <span class="iconLabel">{{ local class }}</span>
                </td>
                {{#each prices}}
                <td class="item">
                    {{#if this}}
                      <a href="{{../../../../url}}">{{local 'from_price'}} {{ this }}</a>
                    {{else}}
                        ---
                    {{/if}}
                </td> 
                {{/each}}
            </tr>
            {{/each}}
        </tbody>
    </table>
    
    {{/with}}
    
    {{>logo}}
</div>

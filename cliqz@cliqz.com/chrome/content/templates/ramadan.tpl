  <div class="cqz-result-h1 cqz-result-padding cqz-ramadan" >

    {{#with data}}
        <div class="cqz-result-title overflow"><a href="{{../url}}" extra="title">Ramadan</a></div>
        <div class="cqz-result-url overflow" extra="url">{{../urlDetails.friendly_url}}</div>
        <div class="cqz-result-desc overflow cqz-ramadan-desc">{{local 'RamadanDes'}}</div>

        <div class="ramadanEZ-daylef">
           <div class="ramadanEZ-daylef-bar">
               <div class="ramadanEZ-daylef-bar-dayover" style=" width:{{daysoverPercent}}%;"></div>
           </div>
           <div class="ramadanEZ-dayinfo">
                <div class="ramadanEZ-dayinfo-left">{{local 'today'}} <span class="ramadanEZ-dayinfo-txt">{{currentDate}}</span></div>
                <div class="ramadanEZ-dayinfo-right ramadanEZ-dayinfo-txt">{{local 'TillEndRamadan' daysleft}}</div>
           </div>
        </div>
    {{/with}}

   <div class="ramadanEZ_info">
        <div class="ramadanEZ_info_table">
            <table cellpadding="0" cellspacing="0">
               <tr>
                    <td><div class="turkishflag icon">Icon</div></td>
                    <td><div class="sunup icon">Icon</div></td>
                    <td><div class="sundown icon">Icon</div></td>
              </tr>
              {{#each data.cityDataTurkey}}
                <tr>
                  <td class="name">{{city}}</td>
                  <td>{{Imsak}}</td>
                  <td>{{Yatsi}}</td>
                </tr>
              {{/each }}
            </table>
        </div>

       <div class="ramadanEZ_info_buttons">
           {{#each data.categories}}
                <div
                  class="cqz-ez-btn {{ ../logo.buttonsClass }}"
                  url="{{ url }}"
                  extra="cat-{{ @index }}" arrow="false" arrow-if-visible='true'>
                    {{ emphasis (local title_key) ../../text 2 true}}
                </div>
            {{/each}}
       </div>
   </div>



    {{> logo}}
  </div>



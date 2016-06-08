{{#if data.big_rs_size}}
  <div class="cqz-result-h2 cqz-local cqz-result-padding cqz-local-result">
    <div class="cqz-zone-holder">
      {{#with data}}
        <div class="cqz-local-top-blk">
          {{#if map_img}}
            <div class="cqz-image-round cqz-local-img-container" >
              <img src="{{map_img}}" url="{{mu}}" class="cqz-rd-img local-data-img" onerror="this.style.display='none';" extra="map-image"/>
            </div>
          {{/if}}

          <div class="cqz-rhh3-snipet-txt">
            <div class="cqz-result-title overflow" arrow-override=''><a href="{{../url}}" extra="title">{{title}}</a></div>
            <div class="cqz-result-url overflow" extra="url">{{friendly_url}}</div>
            <div class="cqz-rd-snippet_hspacing">
              <img src="{{url_ratingimg}}" class="cqz-rd-rateimg " onerror="this.style.display='none';" extra="des-rate"/>
            </div>
          </div>
          <div class="cqz-local-result-descr">{{description}}</div>
        </div>
        <div class="cqz-local-des-blk local-sc-data-container">
          {{#unless no_location}}
            <hr class="cqz-local-hr" />

            <div class="cqz-local-info">
              {{#if phone_address}}
                <div class="cqz-local-info-left cqz-local-info-box" >
                  {{#if address}}
                    <div class="cqz-local-address" extra="address" show-status='true' url="{{mu}}">
                      <img src="http://cdn.cliqz.com/extension/EZ/local/map-pin.svg" class="cqz-local-icon clz_link" onerror="this.style.display='none';"/>
                      {{address}}
                    </div>
                  {{/if}}
                  {{#if phonenumber}}
                    <div extra="phone_num" cliqz-action="copy_val">
                      <img src="http://cdn.cliqz.com/extension/EZ/local/phone-1.svg" class="cqz-local-icon clz_copy" onerror="this.style.display='none';"/>
                      <span class="clz_copy">{{phonenumber}}</span>
                    </div>
                  {{/if}}
                </div>
              {{/if}}
              {{#if opening_hours}}
                <div class="cqz-local-info-right cqz-local-info-box" extra="open-hour">
                  <div class="cqz-local-time">
                    <p class="cqz-local-time-title" style="color: {{opening_status.color}}">
                      <img src="http://cdn.cliqz.com/extension/EZ/local/clock.svg" class="cqz-local-icon" onerror="this.style.display='none';"/>
                      {{opening_status.stt_text}}
                    </p>
                    <p>
                      {{opening_status.time_info_til}}
                    </p>
                    <p>
                      {{opening_status.time_info_str}}
                    </p>
                  </div>
                </div>
              {{/if}}

            </div>
          {{else}}
            {{>partials/missing_location_1}}
          {{/unless}}
        </div>
      {{/with}}
    </div>
    {{> logo}}
  </div>
{{else}}
  {{>rd-h3-w-rating}}
{{/if}}

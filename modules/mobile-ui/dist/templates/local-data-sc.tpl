<!-- local-data-sc.tpl -->
{{#with logo}}
	<div extra="logo" class="card__logo {{#if backgroundImage}}bg{{/if}}" style="{{#if backgroundImage}}background-image:{{backgroundImage}};{{#if backgroundColor}} background-color:#{{backgroundColor}};{{/if}}{{else}}{{ style }};{{/if}}">{{ text }}</div>
 {{/with}}


  <!--<section class="primary">


        <h1 class="card__title">
           ####TITLE#######
        </h1>

        <div class="card__meta">
            ####META#######
        </div>


  </section>-->
  {{#if data.big_rs_size}}
    <section class="primary">
      <div class="card__description">
        <div class="cqz-result-h2 cqz-local cqz-result-padding cqz-local-result">
            <div class="cqz-zone-holder">
              <div class="meta">
                  {{#with data}}
                  <h3 extra="url" class="meta__url"><i class="fa fa-mobile mobile"></i> {{friendly_url}}</h3>
              </div>
              <div class="main local">
                <div class="item">
                  <div class="cf local__head">
                    {{#if map_img}}
                    <div class="main__image"/>
                        <img data-src="{{map_img}}" extra="map-image" url="{{mu}}" class="cqz-rd-img local-data-img" onerror="this.style.display='none';"/>
                    </div>
                    {{/if}}
                    <h1 class="main__headline {{#if no_location}}no__loc__headline{{/if}}"><a url="{{../url}}" extra="title">{{title}}</a></h1>
                    <div class="main__meta {{#if no_location}}no__loc__meta{{/if}}">
                      <div class="cqz-rd-snippet_hspacing">
                        <img data-src="{{url_ratingimg}}" class="cqz-rd-rateimg " onerror="this.style.display='none';" extra="des-rate"/>
                      </div>
                      <div extra="distance">
                          {{#unless no_location}}
                            {{#if (logic distance '>' -1)}}
                              {{distance distance}}
                            {{/if}}
                          {{/unless}}
                      </div>
                    </div>
                  </div>



                <div class="cqz-local-des-blk local-sc-data-container">
                  {{#unless no_location}}

                    <div class="cqz-local-info">
                      {{#if phone_address}}
                        <div class="cqz-local-info-left cqz-local-info-box" >
                          {{#if address}}
                            <div class="cqz-local-address" extra="address" show-status='true' url="{{mu}}">
                              <div class="icon" data-style="background-image: url(http://cdn.cliqz.com/extension/EZ/local/map-pin.svg)">
                                Icon
                              </div> {{address}}
                            </div>
                          {{/if}}
                          {{#if phonenumber}}
                            <div class="phone_num" cliqz-action="stop-click-event-propagation" onclick="osAPI.browserAction('{{phonenumber}}','phoneNumber')">
                              <div class="icon" data-style="background-image: url(http://cdn.cliqz.com/extension/EZ/local/phone-1.svg)">
                                Icon
                              </div>
                              <span class="clz_copy">{{phonenumber}}</span>
                            </div>
                          {{/if}}
                        </div>
                      {{/if}}
                      {{#if opening_hours}}
                        <div class="cqz-local-info-right cqz-local-info-box" extra="open-hour">
                          <div class="cqz-local-time">
                            <div class="icon" data-style="background-image: url(http://cdn.cliqz.com/extension/EZ/local/clock.svg)">
                              Icon
                            </div>
                            <p class="cqz-local-time-title" style="color: {{opening_status.color}}">
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
                  {{/unless}}
                  <div extra="des" class="main__content description">{{{description}}}</div>
                </div>
              {{/with}}
            </div>
          </div>
          </div>
          </div>
        {{else}}
          {{>rd-h3-w-rating}}
        {{/if}}
      </div>
  </section>

<!-- end local-data-sc.tpl -->

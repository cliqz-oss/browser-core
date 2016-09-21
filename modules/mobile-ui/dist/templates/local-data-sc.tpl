<!-- local-data-sc.tpl -->
{{#with logo}}
	<div extra="logo" class="card__logo {{#if backgroundImage}}bg{{/if}}" style="{{#if backgroundImage}}background-image:{{backgroundImage}};{{#if backgroundColor}} background-color:#{{backgroundColor}};{{/if}}{{else}}{{ style }};{{/if}}">{{ text }}</div>
{{/with}}
<div extra="url" class="card__meta"><div>{{url}}</div></div>

{{#with data}}
    <section class="primary">
        <div class="card__title">
            <div url="{{../url}}" extra="title">{{title}}</div>
        </div>
        <div class="cqz-local-result">
            <div class="local__head">
                {{#if address}}
                    <div class="address__details">
                        <div extra="address" show-status='true' class="address__text"
                            cliqz-action="stop-click-event-propagation" onclick="osAPI.browserAction('{{mu}}','map')">
                            {{ address }}
                        </div>
                    </div>
                {{/if}}
                {{#if map_img}}
                    <img class="map__img" data-src="{{map_img}}" extra="map-image"
                         onerror="this.style.display='none';"
                         cliqz-action="stop-click-event-propagation" onclick="osAPI.browserAction('{{mu}}','map')"/>
                {{/if}}
            </div>
            <div class="local__details">
                {{#unless no_location}}
                    <div class="cqz-local-info">
                        <div class="local-distance">
                            <div class="icon" data-style="background-image: url(http://cdn.cliqz.com/extension/EZ/local/map-pin.svg)">
                            icon
                            </div> 
                            {{#if (logic distance '>' -1)}}
                                {{distance distance}}
                            {{/if}}
                        </div>
                        {{#if phone_address}}
                              {{#if phonenumber}}
                                <div class="phone_num" cliqz-action="stop-click-event-propagation" onclick="osAPI.browserAction('{{phonenumber}}','phoneNumber')">
                                  <div class="icon" data-style="background-image: url(http://cdn.cliqz.com/extension/EZ/local/phone-1.svg)">
                                    Icon
                                  </div>
                                  {{phonenumber}}
                                </div>
                              {{/if}}
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
            </div>
        </div>
        <div extra="des" class="card__description">{{description}}</div>
    </section>
{{/with}}
<section class="secondary">
    {{#each data.deepLinks}}
        <div url="{{url}}" extra="link-{{@index}}" class="cards__item links">
            <h2 class="cards__title__secondary">
                {{title}}
            </h2>
        </div>
    {{/each}}

</section>

<!-- end local-data-sc.tpl -->

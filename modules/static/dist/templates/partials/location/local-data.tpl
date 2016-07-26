{{#with data}}
    <div class="cqz-gnrc-special-snippet cqz-snippet-local-data">
        <span class="cqz-snippet-title">test text</span>
        
    </div>
    <div class="cqz-local-top-blk">
        {{#if map_img}}
            <div class="cqz-image-round cqz-local-img-container" extra="map-image">
                <img src="{{map_img}}" url="{{mu}}" class="cqz-rd-img local-data-img"
                     onerror="this.style.display='none';"/>
            </div>
        {{/if}}
        {{! rating ----------}}
        <div class="cqz-rd-snippet_hspacing">
            <img src="{{url_ratingimg}}" class="cqz-rd-rateimg " onerror="this.style.display='none';"
                 extra="des-rate"/>
        </div>
        {{! rating ----------}}

        <div class="cqz-local-info">
            {{#if phone_address}}
                <div class="cqz-local-info-left cqz-local-info-box">
                    {{#if address}}
                        <div class="cqz-local-address" extra="address" show-status='true' url="{{mu}}">
                            <img src="http://cdn.cliqz.com/extension/EZ/local/map-pin.svg"
                                 class="cqz-local-icon clz_link" onerror="this.style.display='none';"/>
                            {{address}}
                        </div>
                    {{/if}}
                    {{#if phonenumber}}
                        <div extra="phone_num" cliqz-action="copy_val">
                            <img src="http://cdn.cliqz.com/extension/EZ/local/phone-1.svg"
                                 class="cqz-local-icon clz_copy" onerror="this.style.display='none';"/>
                            <span class="clz_copy">{{phonenumber}}</span>
                        </div>
                    {{/if}}
                </div>
            {{/if}}
            {{#if opening_hours}}
                <div class="cqz-local-info-right cqz-local-info-box" extra="open-hour">
                    <div class="cqz-local-time">
                        <p class="cqz-local-time-title" style="color: {{opening_status.color}}">
                            <img src="http://cdn.cliqz.com/extension/EZ/local/clock.svg"
                                 class="cqz-local-icon" onerror="this.style.display='none';"/>
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
    </div>
{{/with}}
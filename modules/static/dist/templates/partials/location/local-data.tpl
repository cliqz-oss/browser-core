<div class="cqz-row cqz-local-data cqz-collapse-outer-space">
    {{#if data.map_img}}
    <div class="cqz-col-3 local-img-holder" extra="map-image">
        <!--span class="cqz-vertical-title">{{local 'local_result_vertical_title'}}</span-->
        <img src="{{ data.map_img }}" url="{{ data.mu }}" class="cqz-local-data-img"
             onerror="this.style.display='none';"/>
    </div>
    {{/if}}
    <div class="cqz-local-info cqz-col-9">
        {{> 'partials/ez-title' }}
        {{> 'partials/ez-url' }}
        {{#with data}}
        <ul class="cqz-local-info-box">
            {{#if address}}
            <li class="cqz-local-address" extra="address" show-status='true' url="{{mu}}">
                <img src="http://cdn.cliqz.com/extension/EZ/local/map-pin.svg" class="cqz-local-icon clz_link" onerror="this.style.display='none';"/>
                <span>{{address}}</span>
            </li>
            {{/if}}
            {{!-- #if url_ratingimg}}
            <li class="cqz-local-rating">
                <img src="{{url_ratingimg}}" class="cqz-rd-rateimg " onerror="this.style.display='none';"
                     extra="des-rate"/>
            </li>
            {{/if --}}
            <li>
                {{#if phonenumber}}
                <div class="cqz-local-phone" extra="phone_num" cliqz-action="copy_val">
                    <img src="http://cdn.cliqz.com/extension/EZ/local/phone-1.svg" class="cqz-local-icon clz_copy" onerror="this.style.display='none';"/>
                    <span class="clz_copy">{{phonenumber}}</span>
                </div>
                {{/if}}
                {{#if opening_hours}}
                <div class="cqz-local-time" extra="open-hour">
                    <div class="cqz-local-time-open-hour">
                        <img src="http://cdn.cliqz.com/extension/EZ/local/clock.svg" class="cqz-local-icon" onerror="this.style.display='none';"/>
                        <span>{{opening_status.time_info_str}}</span>
                    </div>
                    <div class="cqz-local-time-title" style="color: {{opening_status.color}}">
                        <span>{{opening_status.stt_text}}</span>
                    </div>
                </div>
                {{/if}}
            </li>
        </ul>
        {{/with}}
    </div>
</div>
<div class="cqz-local-desc">
{{> 'partials/ez-description' }}
</div>
